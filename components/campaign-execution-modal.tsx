"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Card, CardContent } from "@/components/ui/card"
import { CheckCircle, XCircle, Clock, AlertTriangle, MessageSquare } from "lucide-react"
import { executeCampaign, type Campaign, type CampaignExecutionResult } from "@/lib/messaging"

interface CampaignExecutionModalProps {
  campaign: Campaign
  open: boolean
  onClose: () => void
  onComplete: () => void
}

interface ExecutionProgress {
  sent: number
  total: number
  currentRecipient: string
}

export function CampaignExecutionModal({ campaign, open, onClose, onComplete }: CampaignExecutionModalProps) {
  const [executing, setExecuting] = useState(false)
  const [progress, setProgress] = useState<ExecutionProgress>({ sent: 0, total: 0, currentRecipient: "" })
  const [result, setResult] = useState<CampaignExecutionResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open && !executing && !result) {
      // Auto-start execution when modal opens
      handleExecute()
    }
  }, [open])

  const handleExecute = async () => {
    setExecuting(true)
    setError(null)
    setResult(null)

    try {
      const executionResult = await executeCampaign(campaign, (progressUpdate) => {
        setProgress(progressUpdate)
      })

      setResult(executionResult)

      // Auto-close after successful completion
      setTimeout(() => {
        onComplete()
      }, 3000)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error occurred"
      setError(errorMessage)
    } finally {
      setExecuting(false)
    }
  }

  const handleClose = () => {
    if (!executing) {
      onClose()
    }
  }

  const progressPercentage = progress.total > 0 ? Math.round((progress.sent / progress.total) * 100) : 0

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <MessageSquare className="h-5 w-5" />
            <span>Executing Campaign</span>
          </DialogTitle>
          <DialogDescription>Sending messages for "{campaign.name}"</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Campaign Info */}
          <Card className="border-border/50 bg-muted/50">
            <CardContent className="pt-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Methods:</span>
                  <div className="flex space-x-1">
                    {campaign.methods.map((method) => (
                      <span key={method} className="px-2 py-1 rounded text-xs bg-secondary text-secondary-foreground">
                        {method.toUpperCase()}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="text-sm">
                  <span className="text-muted-foreground">Message: </span>
                  <span className="line-clamp-2">{campaign.message_text}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Execution Progress */}
          {executing && (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Progress</span>
                  <span>
                    {progress.sent} of {progress.total}
                  </span>
                </div>
                <Progress value={progressPercentage} className="w-full" />
                <p className="text-xs text-muted-foreground">
                  {progress.currentRecipient && `Sending to: ${progress.currentRecipient}`}
                </p>
              </div>

              <div className="flex items-center justify-center space-x-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4 animate-pulse" />
                <span>Sending messages...</span>
              </div>
            </div>
          )}

          {/* Results */}
          {result && (
            <Card
              className={`border-border/50 ${result.successCount > 0 ? "bg-green-50 dark:bg-green-950/20" : "bg-red-50 dark:bg-red-950/20"}`}
            >
              <CardContent className="pt-4">
                <div className="flex items-start space-x-3">
                  {result.successCount > 0 ? (
                    <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-500 mt-0.5" />
                  )}
                  <div className="space-y-2 flex-1">
                    <p className="text-sm font-medium">Campaign {result.successCount > 0 ? "Completed" : "Failed"}</p>

                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <span className="text-muted-foreground">Total Recipients:</span>
                        <span className="font-medium ml-1">{result.totalRecipients}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Successful:</span>
                        <span className="font-medium ml-1 text-green-600">{result.successCount}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Failed:</span>
                        <span className="font-medium ml-1 text-red-600">{result.failureCount}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Success Rate:</span>
                        <span className="font-medium ml-1">
                          {result.totalRecipients > 0
                            ? Math.round((result.successCount / result.totalRecipients) * 100)
                            : 0}
                          %
                        </span>
                      </div>
                    </div>

                    {result.errors.length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs text-red-600 font-medium">Errors:</p>
                        <div className="max-h-20 overflow-y-auto">
                          {result.errors.slice(0, 3).map((error, index) => (
                            <p key={index} className="text-xs text-red-600">
                              {error}
                            </p>
                          ))}
                          {result.errors.length > 3 && (
                            <p className="text-xs text-red-600">... and {result.errors.length - 3} more</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Error Display */}
          {error && (
            <Card className="border-border/50 bg-red-50 dark:bg-red-950/20">
              <CardContent className="pt-4">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-red-600">Execution Failed</p>
                    <p className="text-xs text-red-600 mt-1">{error}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-4 border-t">
            <div>
              {result && result.successCount > 0 && (
                <p className="text-xs text-green-600">Campaign completed successfully!</p>
              )}
            </div>
            <div className="flex space-x-2">
              {error && (
                <Button variant="outline" onClick={handleExecute} disabled={executing}>
                  Retry
                </Button>
              )}
              <Button onClick={handleClose} disabled={executing}>
                {result ? "Close" : "Cancel"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
