"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Card, CardContent } from "@/components/ui/card"
import {
  getCampaignRecipients,
  getRecipients,
  type Campaign,
  type Recipient,
  type CampaignRecipient,
} from "@/lib/firestore"
import { Users, CheckCircle, Clock, AlertCircle } from "lucide-react"

interface ViewRecipientsModalProps {
  campaign: Campaign
  open: boolean
  onClose: () => void
}

export function ViewRecipientsModal({ campaign, open, onClose }: ViewRecipientsModalProps) {
  const [campaignRecipients, setCampaignRecipients] = useState<CampaignRecipient[]>([])
  const [recipients, setRecipients] = useState<Recipient[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (open && campaign.id) {
      loadCampaignRecipients()
    }
  }, [open, campaign.id])

  const loadCampaignRecipients = async () => {
    if (!campaign.id) return

    try {
      const [campaignRecs, allRecipients] = await Promise.all([getCampaignRecipients(campaign.id), getRecipients()])

      setCampaignRecipients(campaignRecs)
      setRecipients(allRecipients)
    } catch (error) {
      console.error("Error loading campaign recipients:", error)
    } finally {
      setLoading(false)
    }
  }

  const getRecipientDetails = (recipientId: string) => {
    return recipients.find((r) => r.id === recipientId)
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "sent":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "pending":
        return <Clock className="h-4 w-4 text-yellow-500" />
      case "failed":
        return <AlertCircle className="h-4 w-4 text-red-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-500" />
    }
  }

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Campaign Recipients</DialogTitle>
            <DialogDescription>Loading recipients...</DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Campaign Recipients</DialogTitle>
          <DialogDescription>
            Recipients for "{campaign.name}" ({campaignRecipients.length} total)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {campaignRecipients.length === 0 ? (
            <Card className="border-border/50 bg-card/50">
              <CardContent className="flex flex-col items-center justify-center py-8">
                <Users className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">No recipients found for this campaign</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {campaignRecipients.map((campaignRecipient) => {
                const recipient = getRecipientDetails(campaignRecipient.recipient_id)
                if (!recipient) return null

                return (
                  <Card key={campaignRecipient.id} className="border-border/50">
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-1">
                            <p className="text-sm font-medium">{recipient.name}</p>
                            {getStatusIcon(campaignRecipient.status)}
                          </div>
                          <p className="text-xs text-muted-foreground mb-2">
                            {recipient.telephone} • {recipient.email}
                          </p>
                          {recipient.interests.length > 0 && (
                            <div className="flex flex-wrap gap-1">
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
                        <div className="text-right">
                          <p
                            className={`text-xs font-medium capitalize ${
                              campaignRecipient.status === "sent"
                                ? "text-green-500"
                                : campaignRecipient.status === "pending"
                                  ? "text-yellow-500"
                                  : "text-red-500"
                            }`}
                          >
                            {campaignRecipient.status}
                          </p>
                          {campaignRecipient.attempts > 0 && (
                            <p className="text-xs text-muted-foreground">
                              {campaignRecipient.attempts} attempt{campaignRecipient.attempts > 1 ? "s" : ""}
                            </p>
                          )}
                          {campaignRecipient.error_message && (
                            <p
                              className="text-xs text-red-500 mt-1 max-w-32 truncate"
                              title={campaignRecipient.error_message}
                            >
                              {campaignRecipient.error_message}
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
