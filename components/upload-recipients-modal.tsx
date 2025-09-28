"use client"

import type React from "react"

import { useState } from "react"
import { useAuth } from "@/hooks/use-auth"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Upload, FileText, AlertCircle, CheckCircle, XCircle } from "lucide-react"
import { processFile, type ProcessingResult } from "@/lib/file-processor"

interface UploadRecipientsModalProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

export function UploadRecipientsModal({ open, onClose, onSuccess }: UploadRecipientsModalProps) {
  const { user } = useAuth()
  const [dragActive, setDragActive] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<ProcessingResult | null>(null)
  const [progress, setProgress] = useState(0)

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0])
    }
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0])
    }
  }

  const handleFile = (selectedFile: File) => {
    const validTypes = [
      "text/csv",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ]

    const maxSize = 20 * 1024 * 1024 // 20MB

    if (selectedFile.size > maxSize) {
      alert("File size must be less than 20MB")
      return
    }

    if (
      validTypes.includes(selectedFile.type) ||
      selectedFile.name.endsWith(".csv") ||
      selectedFile.name.endsWith(".xlsx") ||
      selectedFile.name.endsWith(".xls")
    ) {
      setFile(selectedFile)
      setResult(null) // Reset previous results
    } else {
      alert("Please select a CSV or Excel file")
    }
  }

  const handleUpload = async () => {
    if (!file || !user) return

    setUploading(true)
    setProgress(0)

    try {
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return 90
          }
          return prev + 10
        })
      }, 200)

      const processingResult = await processFile(file, user.uid)

      clearInterval(progressInterval)
      setProgress(100)
      setResult(processingResult)

      if (processingResult.success && processingResult.processed > 0) {
        // Wait a moment to show completion, then call success
        setTimeout(() => {
          onSuccess()
        }, 1500)
      }
    } catch (error) {
      console.error("Error processing file:", error)
      setResult({
        success: false,
        processed: 0,
        updated: 0,
        created: 0,
        errors: [error instanceof Error ? error.message : "Unknown error occurred"],
        duplicates: 0,
      })
    } finally {
      setUploading(false)
    }
  }

  const resetModal = () => {
    setFile(null)
    setDragActive(false)
    setUploading(false)
    setResult(null)
    setProgress(0)
  }

  const handleClose = () => {
    if (!uploading) {
      resetModal()
      onClose()
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Upload Recipients</DialogTitle>
          <DialogDescription>Upload a CSV or Excel file with your recipient list</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* File Format Info */}
          <Card className="border-border/50 bg-muted/50">
            <CardContent className="pt-4">
              <div className="flex items-start space-x-3">
                <AlertCircle className="h-5 w-5 text-blue-500 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium">Required Format</p>
                  <p className="text-xs text-muted-foreground">
                    Your file must have these columns: <strong>Name, Telephone, Email, Interest</strong>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Interest column can contain comma-separated values like: "Botox,Skin-Prep,Facial-Massage"
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Existing recipients will be updated based on telephone number.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Processing Results */}
          {result && (
            <Card
              className={`border-border/50 ${result.success ? "bg-green-50 dark:bg-green-950/20" : "bg-red-50 dark:bg-red-950/20"}`}
            >
              <CardContent className="pt-4">
                <div className="flex items-start space-x-3">
                  {result.success ? (
                    <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-500 mt-0.5" />
                  )}
                  <div className="space-y-2 flex-1">
                    <p className="text-sm font-medium">
                      {result.success ? "Processing Complete!" : "Processing Failed"}
                    </p>

                    {result.processed > 0 && (
                      <div className="grid grid-cols-2 gap-4 text-xs">
                        <div>
                          <span className="text-muted-foreground">Processed:</span>
                          <span className="font-medium ml-1">{result.processed}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Created:</span>
                          <span className="font-medium ml-1 text-green-600">{result.created}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Updated:</span>
                          <span className="font-medium ml-1 text-blue-600">{result.updated}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Duplicates:</span>
                          <span className="font-medium ml-1 text-yellow-600">{result.duplicates}</span>
                        </div>
                      </div>
                    )}

                    {result.errors.length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs text-red-600 font-medium">Errors:</p>
                        <div className="max-h-20 overflow-y-auto">
                          {result.errors.map((error, index) => (
                            <p key={index} className="text-xs text-red-600">
                              {error}
                            </p>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Upload Progress */}
          {uploading && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Processing file...</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="w-full" />
            </div>
          )}

          {/* File Upload Area */}
          {!file ? (
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-4" />
              <p className="text-sm font-medium mb-2">Drop your CSV or Excel file here</p>
              <p className="text-xs text-muted-foreground mb-4">or click to browse files (max 20MB)</p>
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileInput}
                className="hidden"
                id="file-upload"
              />
              <Button variant="outline" asChild>
                <label htmlFor="file-upload" className="cursor-pointer">
                  Choose File
                </label>
              </Button>
            </div>
          ) : (
            // File Selected
            <Card className="border-border/50">
              <CardContent className="pt-4">
                <div className="flex items-center space-x-3">
                  <FileText className="h-8 w-8 text-primary" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{file.name}</p>
                    <p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                  {!uploading && !result && (
                    <Button variant="ghost" size="sm" onClick={() => setFile(null)}>
                      Remove
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-4 border-t">
            <Button variant="outline" onClick={handleClose} disabled={uploading}>
              {result?.success ? "Close" : "Cancel"}
            </Button>
            {!result && (
              <Button onClick={handleUpload} disabled={!file || uploading}>
                {uploading ? "Processing..." : "Upload & Process"}
              </Button>
            )}
            {result && !result.success && (
              <Button onClick={() => setResult(null)} variant="outline">
                Try Again
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
