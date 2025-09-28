"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/hooks/use-auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, Upload, MessageSquare, Eye, Calendar, CheckCircle, Clock, AlertCircle, Play } from "lucide-react"
import { CreateCampaignModal } from "@/components/create-campaign-modal"
import { UploadRecipientsModal } from "@/components/upload-recipients-modal"
import { ViewRecipientsModal } from "@/components/view-recipients-modal"
import { CampaignExecutionModal } from "@/components/campaign-execution-modal"
import { getCampaigns, type Campaign } from "@/lib/firestore"
import type { Timestamp } from "firebase/firestore"

export function CampaignsPage() {
  const { user } = useAuth()
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null)
  const [executingCampaign, setExecutingCampaign] = useState<Campaign | null>(null)

  useEffect(() => {
    loadCampaigns()
  }, [user])

  const loadCampaigns = async () => {
    if (!user) return

    try {
      const { campaigns } = await getCampaigns(user.uid)
      setCampaigns(campaigns)
    } catch (error) {
      console.error("Error loading campaigns:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleCampaignCreated = () => {
    setShowCreateModal(false)
    loadCampaigns()
  }

  const handleRecipientsUploaded = () => {
    setShowUploadModal(false)
  }

  const handleExecuteCampaign = (campaign: Campaign) => {
    setExecutingCampaign(campaign)
  }

  const handleExecutionComplete = () => {
    setExecutingCampaign(null)
    loadCampaigns() // Refresh to show updated status
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "sending":
        return <Clock className="h-4 w-4 text-blue-500 animate-pulse" />
      case "draft":
        return <AlertCircle className="h-4 w-4 text-yellow-500" />
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />
    }
  }

  const formatDate = (timestamp: Timestamp) => {
    return timestamp.toDate().toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const canExecuteCampaign = (campaign: Campaign) => {
    return campaign.status === "draft"
  }

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-balance">Campaigns</h2>
            <p className="text-muted-foreground mt-2">Loading your campaigns...</p>
          </div>
        </div>
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-balance">Campaigns</h2>
          <p className="text-muted-foreground mt-2">Manage your SMS and WhatsApp marketing campaigns</p>
        </div>
        <div className="flex items-center space-x-4">
          <Button variant="outline" onClick={() => setShowUploadModal(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Upload Recipients
          </Button>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Campaign
          </Button>
        </div>
      </div>

      {campaigns.length === 0 ? (
        // Empty State
        <Card className="border-border/50 bg-card/50">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No campaigns yet</h3>
            <p className="text-muted-foreground text-center mb-6 max-w-md">
              Create your first campaign to start sending SMS and WhatsApp messages to your recipients.
            </p>
            <div className="flex items-center space-x-4">
              <Button variant="outline" onClick={() => setShowUploadModal(true)}>
                <Upload className="h-4 w-4 mr-2" />
                Upload Recipients First
              </Button>
              <Button onClick={() => setShowCreateModal(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Campaign
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        // Campaigns List
        <div className="grid gap-6">
          {campaigns.map((campaign) => (
            <Card key={campaign.id} className="border-border/50 bg-card/50">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="flex items-center space-x-2">
                      <span>{campaign.name}</span>
                      {getStatusIcon(campaign.status)}
                    </CardTitle>
                    <CardDescription>{campaign.description}</CardDescription>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button variant="outline" size="sm" onClick={() => setSelectedCampaign(campaign)}>
                      <Eye className="h-4 w-4 mr-1" />
                      View Recipients
                    </Button>
                    {canExecuteCampaign(campaign) && (
                      <Button size="sm" onClick={() => handleExecuteCampaign(campaign)}>
                        <Play className="h-4 w-4 mr-1" />
                        Execute
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Campaign Methods */}
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-muted-foreground">Methods:</span>
                      <div className="flex items-center space-x-1">
                        {campaign.methods.map((method) => (
                          <span
                            key={method}
                            className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-secondary text-secondary-foreground"
                          >
                            {method.toUpperCase()}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        Created: {formatDate(campaign.created_datetime)}
                      </span>
                    </div>
                  </div>

                  {/* Message Preview */}
                  <div className="bg-muted/50 rounded-lg p-3">
                    <p className="text-sm text-muted-foreground mb-1">Message:</p>
                    <p className="text-sm line-clamp-2">{campaign.message_text}</p>
                  </div>

                  {/* Status */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-muted-foreground">Status:</span>
                      <span
                        className={`text-sm font-medium capitalize ${
                          campaign.status === "completed"
                            ? "text-green-500"
                            : campaign.status === "sending"
                              ? "text-blue-500"
                              : "text-yellow-500"
                        }`}
                      >
                        {campaign.status}
                      </span>
                    </div>
                    {campaign.end_datetime && (
                      <span className="text-sm text-muted-foreground">
                        Completed: {formatDate(campaign.end_datetime)}
                      </span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modals */}
      <CreateCampaignModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={handleCampaignCreated}
      />

      <UploadRecipientsModal
        open={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onSuccess={handleRecipientsUploaded}
      />

      {selectedCampaign && (
        <ViewRecipientsModal
          campaign={selectedCampaign}
          open={!!selectedCampaign}
          onClose={() => setSelectedCampaign(null)}
        />
      )}

      {executingCampaign && (
        <CampaignExecutionModal
          campaign={executingCampaign}
          open={!!executingCampaign}
          onClose={() => setExecutingCampaign(null)}
          onComplete={handleExecutionComplete}
        />
      )}
    </div>
  )
}
