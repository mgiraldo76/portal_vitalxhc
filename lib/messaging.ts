import { updateDoc, doc, Timestamp } from "firebase/firestore"
import { db } from "./firebase"
import { logUserEvent, getCampaignRecipients, getRecipients, type Campaign } from "./firestore"

export interface MessageResult {
  success: boolean
  messageId?: string
  error?: string
  attempts: number
}

export interface CampaignExecutionResult {
  totalRecipients: number
  successCount: number
  failureCount: number
  errors: string[]
}

// Twilio SMS Integration
export async function sendSMS(to: string, message: string): Promise<MessageResult> {
  try {
    const response = await fetch("/api/send-sms", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ to, message }),
    })

    const result = await response.json()

    if (response.ok) {
      return {
        success: true,
        messageId: result.messageId,
        attempts: 1,
      }
    } else {
      return {
        success: false,
        error: result.error || "Failed to send SMS",
        attempts: 1,
      }
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Network error",
      attempts: 1,
    }
  }
}

// WhatsApp Business API Integration
export async function sendWhatsApp(to: string, message: string): Promise<MessageResult> {
  try {
    const response = await fetch("/api/send-whatsapp", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ to, message }),
    })

    const result = await response.json()

    if (response.ok) {
      return {
        success: true,
        messageId: result.messageId,
        attempts: 1,
      }
    } else {
      return {
        success: false,
        error: result.error || "Failed to send WhatsApp message",
        attempts: 1,
      }
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Network error",
      attempts: 1,
    }
  }
}

// Retry logic for failed messages
export async function sendMessageWithRetry(
  method: "sms" | "whatsapp",
  to: string,
  message: string,
  maxAttempts = 3,
): Promise<MessageResult> {
  let lastResult: MessageResult = { success: false, error: "No attempts made", attempts: 0 }

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    if (method === "sms") {
      lastResult = await sendSMS(to, message)
    } else {
      lastResult = await sendWhatsApp(to, message)
    }

    lastResult.attempts = attempt

    if (lastResult.success) {
      return lastResult
    }

    // Wait before retry (exponential backoff)
    if (attempt < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 1000))
    }
  }

  return lastResult
}

// Execute campaign - send messages to all recipients
export async function executeCampaign(
  campaign: Campaign,
  onProgress?: (progress: { sent: number; total: number; currentRecipient: string }) => void,
): Promise<CampaignExecutionResult> {
  if (!campaign.id) {
    throw new Error("Campaign ID is required")
  }

  const result: CampaignExecutionResult = {
    totalRecipients: 0,
    successCount: 0,
    failureCount: 0,
    errors: [],
  }

  try {
    // Update campaign status to sending
    await updateDoc(doc(db, "campaigns", campaign.id), {
      status: "sending",
    })

    // Get campaign recipients
    const campaignRecipients = await getCampaignRecipients(campaign.id)
    const allRecipients = await getRecipients(1000)

    result.totalRecipients = campaignRecipients.length

    if (campaignRecipients.length === 0) {
      throw new Error("No recipients found for this campaign")
    }

    // Process each recipient
    for (let i = 0; i < campaignRecipients.length; i++) {
      const campaignRecipient = campaignRecipients[i]
      const recipient = allRecipients.find((r) => r.id === campaignRecipient.recipient_id)

      if (!recipient) {
        result.errors.push(`Recipient not found: ${campaignRecipient.recipient_id}`)
        result.failureCount++
        continue
      }

      // Personalize message
      const personalizedMessage = campaign.message_text.replace(/<recipient_name>/g, recipient.name)

      // Report progress
      if (onProgress) {
        onProgress({
          sent: i,
          total: result.totalRecipients,
          currentRecipient: recipient.name,
        })
      }

      // Send messages for each method
      let recipientSuccess = false
      const recipientErrors: string[] = []

      for (const method of campaign.methods) {
        try {
          const messageResult = await sendMessageWithRetry(method, recipient.telephone, personalizedMessage, 3)

          if (messageResult.success) {
            recipientSuccess = true

            // Log successful send
            await logUserEvent({
              user_id: campaign.created_by,
              action: "message_sent",
              details: {
                campaign_id: campaign.id,
                recipient_id: recipient.id,
                method,
                message_id: messageResult.messageId,
              },
              timestamp: Timestamp.now(),
              campaign_id: campaign.id,
            })
          } else {
            recipientErrors.push(`${method.toUpperCase()}: ${messageResult.error}`)
          }

          // Update campaign recipient status
          await updateDoc(doc(db, "campaign_recipients", campaignRecipient.id!), {
            status: messageResult.success ? "sent" : "failed",
            sent_datetime: messageResult.success ? Timestamp.now() : undefined,
            attempts: messageResult.attempts,
            error_message: messageResult.error || undefined,
          })
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : "Unknown error"
          recipientErrors.push(`${method.toUpperCase()}: ${errorMsg}`)
        }
      }

      if (recipientSuccess) {
        result.successCount++
      } else {
        result.failureCount++
        result.errors.push(`${recipient.name} (${recipient.telephone}): ${recipientErrors.join(", ")}`)
      }

      // Small delay between recipients to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 100))
    }

    // Update campaign status to completed
    await updateDoc(doc(db, "campaigns", campaign.id), {
      status: "completed",
      end_datetime: Timestamp.now(),
    })

    // Log campaign completion
    await logUserEvent({
      user_id: campaign.created_by,
      action: "campaign_completed",
      details: {
        campaign_id: campaign.id,
        total_recipients: result.totalRecipients,
        success_count: result.successCount,
        failure_count: result.failureCount,
      },
      timestamp: Timestamp.now(),
      campaign_id: campaign.id,
    })
  } catch (error) {
    // Update campaign status back to draft on error
    if (campaign.id) {
      await updateDoc(doc(db, "campaigns", campaign.id), {
        status: "draft",
      })
    }

    const errorMsg = error instanceof Error ? error.message : "Unknown error"
    result.errors.push(`Campaign execution failed: ${errorMsg}`)

    // Log campaign failure
    await logUserEvent({
      user_id: campaign.created_by,
      action: "campaign_failed",
      details: {
        campaign_id: campaign.id,
        error: errorMsg,
      },
      timestamp: Timestamp.now(),
      campaign_id: campaign.id,
    })

    throw error
  }

  return result
}
