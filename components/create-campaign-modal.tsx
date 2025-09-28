"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/hooks/use-auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { createCampaign, getRecipients, addCampaignRecipients, logUserEvent, type Recipient } from "@/lib/firestore"
import { Timestamp } from "firebase/firestore"
import { MessageSquare, Smartphone, Users } from "lucide-react"

interface CreateCampaignModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

type Step = "details" | "message" | "recipients"

export function CreateCampaignModal({ open, onClose, onSuccess }: CreateCampaignModalProps) {
  const { user } = useAuth()
  const [step, setStep] = useState<Step>("details")
  const [loading, setLoading] = useState(false)
  const [recipients, setRecipients] = useState<Recipient[]>([])
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([])

  // Form data
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [methods, setMethods] = useState<("sms" | "whatsapp")[]>(["sms"])
  const [messageText, setMessageText] = useState("")

  useEffect(() => {
    if (open && step === "recipients") {
      loadRecipients()
    }
  }, [open, step])

  useEffect(() => {
    if (!open) {
      // Reset form when modal closes
      setStep("details")
      setName("")
      setDescription("")
      setMethods(["sms"])
      setMessageText("")
      setSelectedRecipients([])
    }
  }, [open])

  const loadRecipients = async () => {
    try {
      const recipientsList = await getRecipients()
      setRecipients(recipientsList)
      // Select all recipients by default
      setSelectedRecipients(recipientsList.map((r) => r.id!))
    } catch (error) {
      console.error("Error loading recipients:", error)
    }
  }

  const handleMethodChange = (method: "sms" | "whatsapp", checked: boolean) => {
    if (checked) {
      setMethods((prev) => [...prev, method])
    } else {
      setMethods((prev) => prev.filter((m) => m !== method))
    }
  }

  const handleRecipientToggle = (recipientId: string, checked: boolean) => {
    if (checked) {
      setSelectedRecipients((prev) => [...prev, recipientId])
    } else {
      setSelectedRecipients((prev) => prev.filter((id) => id !== recipientId))
    }
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedRecipients(recipients.map((r) => r.id!))
    } else {
      setSelectedRecipients([])
    }
  }

  const handleNext = () => {
    if (step === "details") {
      setStep("message")
    } else if (step === "message") {
      setStep("recipients")
    }
  }

  const handleBack = () => {
    if (step === "message") {
      setStep("details")
    } else if (step === "recipients") {
      setStep("message")
    }
  }

  const handleSubmit = async () => {
    if (!user || selectedRecipients.length === 0) return

    setLoading(true)
    try {
      // Create campaign
      const campaignId = await createCampaign({
        name,
        description,
        methods,
        message_text: messageText,
        created_datetime: Timestamp.now(),
        created_by: user.uid,
        status: "draft",
      })

      // Add campaign recipients
      await addCampaignRecipients(campaignId, selectedRecipients)

      // Log event
      await logUserEvent({
        user_id: user.uid,
        action: "campaign_created",
        details: {
          campaign_id: campaignId,
          name,
          methods,
          recipient_count: selectedRecipients.length,
        },
        timestamp: Timestamp.now(),
        campaign_id: campaignId,
      })

      onSuccess()
    } catch (error) {
      console.error("Error creating campaign:", error)
    } finally {
      setLoading(false)
    }
  }

  const canProceed = () => {
    if (step === "details") {
      return name.trim() && description.trim() && methods.length > 0
    } else if (step === "message") {
      return messageText.trim()
    } else if (step === "recipients") {
      return selectedRecipients.length > 0
    }
    return false
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Campaign</DialogTitle>
          <DialogDescription>
            Step {step === "details" ? "1" : step === "message" ? "2" : "3"} of 3:{" "}
            {step === "details" ? "Campaign Details" : step === "message" ? "Message Content" : "Select Recipients"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {step === "details" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Campaign Name</Label>
                <Input
                  id="name"
                  placeholder="Enter campaign name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Brief description of this campaign"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="space-y-3">
                <Label>Delivery Methods</Label>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="sms"
                      checked={methods.includes("sms")}
                      onCheckedChange={(checked) => handleMethodChange("sms", checked as boolean)}
                    />
                    <Label htmlFor="sms" className="flex items-center space-x-2">
                      <Smartphone className="h-4 w-4" />
                      <span>SMS Message</span>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="whatsapp"
                      checked={methods.includes("whatsapp")}
                      onCheckedChange={(checked) => handleMethodChange("whatsapp", checked as boolean)}
                    />
                    <Label htmlFor="whatsapp" className="flex items-center space-x-2">
                      <MessageSquare className="h-4 w-4" />
                      <span>WhatsApp Message</span>
                    </Label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === "message" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="message">Message Content</Label>
                <Textarea
                  id="message"
                  placeholder="Enter your message here. Use <recipient_name> as a placeholder for personalization."
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  rows={6}
                />
                <p className="text-sm text-muted-foreground">
                  Tip: Use {"<recipient_name>"} to personalize messages with recipient names.
                </p>
              </div>

              {messageText && (
                <Card className="border-border/50 bg-muted/50">
                  <CardHeader>
                    <CardTitle className="text-sm">Preview</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">{messageText.replace("<recipient_name>", "John Doe")}</p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {step === "recipients" && (
            <div className="space-y-4">
              {recipients.length === 0 ? (
                <Card className="border-border/50 bg-card/50">
                  <CardContent className="flex flex-col items-center justify-center py-8">
                    <Users className="h-8 w-8 text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground text-center">
                      No recipients found. Please upload a recipient list first.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <Label>
                      Select Recipients ({selectedRecipients.length} of {recipients.length})
                    </Label>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="select-all"
                        checked={selectedRecipients.length === recipients.length}
                        onCheckedChange={handleSelectAll}
                      />
                      <Label htmlFor="select-all" className="text-sm">
                        Select All
                      </Label>
                    </div>
                  </div>

                  <div className="max-h-64 overflow-y-auto space-y-2 border rounded-lg p-3">
                    {recipients.map((recipient) => (
                      <div key={recipient.id} className="flex items-center space-x-3 p-2 hover:bg-muted/50 rounded">
                        <Checkbox
                          id={recipient.id}
                          checked={selectedRecipients.includes(recipient.id!)}
                          onCheckedChange={(checked) => handleRecipientToggle(recipient.id!, checked as boolean)}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{recipient.name}</p>
                          <p className="text-xs text-muted-foreground">{recipient.telephone}</p>
                          {recipient.interests.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {recipient.interests.map((interest) => (
                                <span
                                  key={interest}
                                  className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-secondary text-secondary-foreground"
                                >
                                  {interest}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-4 border-t">
            <div>
              {step !== "details" && (
                <Button variant="outline" onClick={handleBack}>
                  Back
                </Button>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              {step !== "recipients" ? (
                <Button onClick={handleNext} disabled={!canProceed()}>
                  Next
                </Button>
              ) : (
                <Button onClick={handleSubmit} disabled={!canProceed() || loading}>
                  {loading ? "Creating..." : "Create Campaign"}
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
