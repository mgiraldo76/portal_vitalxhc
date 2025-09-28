import { type NextRequest, NextResponse } from "next/server"

// WhatsApp Business API configuration
const WHATSAPP_ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN
const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID
const WHATSAPP_BUSINESS_ACCOUNT_ID = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID

export async function POST(request: NextRequest) {
  try {
    const { to, message } = await request.json()

    if (!to || !message) {
      return NextResponse.json({ error: "Phone number and message are required" }, { status: 400 })
    }

    if (!WHATSAPP_ACCESS_TOKEN || !WHATSAPP_PHONE_NUMBER_ID) {
      return NextResponse.json(
        {
          error:
            "WhatsApp configuration missing. Please add WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID to your environment variables.",
        },
        { status: 500 },
      )
    }

    // Format phone number (remove + if present, WhatsApp API expects numbers without +)
    const formattedPhone = to.replace(/^\+/, "")

    // WhatsApp Business API endpoint
    const whatsappUrl = `https://graph.facebook.com/v18.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`

    const payload = {
      messaging_product: "whatsapp",
      to: formattedPhone,
      type: "text",
      text: {
        body: message,
      },
    }

    const response = await fetch(whatsappUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })

    const result = await response.json()

    if (response.ok) {
      return NextResponse.json({
        success: true,
        messageId: result.messages?.[0]?.id,
        status: "sent",
      })
    } else {
      return NextResponse.json(
        { error: result.error?.message || "Failed to send WhatsApp message" },
        { status: response.status },
      )
    }
  } catch (error) {
    console.error("WhatsApp sending error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
