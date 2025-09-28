"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/hooks/use-auth"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Search,
  Filter,
  Download,
  AlertTriangle,
  CheckCircle,
  Info,
  Clock,
  MessageSquare,
  Upload,
  Play,
} from "lucide-react"
import { collection, query, orderBy, limit, where, getDocs, type Timestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"
import type { UserEventLog } from "@/lib/firestore"

export function LogsViewer() {
  const { user } = useAuth()
  const [logs, setLogs] = useState<UserEventLog[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [actionFilter, setActionFilter] = useState("all")
  const [filteredLogs, setFilteredLogs] = useState<UserEventLog[]>([])

  useEffect(() => {
    loadLogs()
  }, [user])

  useEffect(() => {
    filterLogs()
  }, [logs, searchTerm, actionFilter])

  const loadLogs = async () => {
    if (!user) return

    try {
      const logsQuery = query(
        collection(db, "user_event_log"),
        where("user_id", "==", user.uid),
        orderBy("timestamp", "desc"),
        limit(100),
      )

      const snapshot = await getDocs(logsQuery)
      const logsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as UserEventLog[]

      setLogs(logsData)
    } catch (error) {
      console.error("Error loading logs:", error)
    } finally {
      setLoading(false)
    }
  }

  const filterLogs = () => {
    let filtered = logs

    // Filter by action
    if (actionFilter !== "all") {
      filtered = filtered.filter((log) => log.action === actionFilter)
    }

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(
        (log) => log.action.toLowerCase().includes(term) || JSON.stringify(log.details).toLowerCase().includes(term),
      )
    }

    setFilteredLogs(filtered)
  }

  const getActionIcon = (action: string) => {
    switch (action) {
      case "error_occurred":
        return <AlertTriangle className="h-4 w-4 text-red-500" />
      case "campaign_created":
      case "campaign_completed":
        return <MessageSquare className="h-4 w-4 text-blue-500" />
      case "campaign_failed":
        return <AlertTriangle className="h-4 w-4 text-red-500" />
      case "recipients_uploaded":
        return <Upload className="h-4 w-4 text-green-500" />
      case "message_sent":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "campaign_executed":
        return <Play className="h-4 w-4 text-blue-500" />
      default:
        return <Info className="h-4 w-4 text-gray-500" />
    }
  }

  const getActionColor = (action: string) => {
    switch (action) {
      case "error_occurred":
      case "campaign_failed":
        return "destructive"
      case "campaign_completed":
      case "message_sent":
      case "recipients_uploaded":
        return "default"
      case "campaign_created":
      case "campaign_executed":
        return "secondary"
      default:
        return "outline"
    }
  }

  const formatTimestamp = (timestamp: Timestamp) => {
    return timestamp.toDate().toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
  }

  const exportLogs = () => {
    const csvContent = [
      ["Timestamp", "Action", "Details"].join(","),
      ...filteredLogs.map((log) =>
        [
          formatTimestamp(log.timestamp),
          log.action,
          JSON.stringify(log.details).replace(/,/g, ";"), // Replace commas to avoid CSV issues
        ].join(","),
      ),
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `campaign-logs-${new Date().toISOString().split("T")[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const uniqueActions = Array.from(new Set(logs.map((log) => log.action)))

  if (loading) {
    return (
      <Card className="border-border/50 bg-card/50">
        <CardContent className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card className="border-border/50 bg-card/50">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Clock className="h-5 w-5" />
            <span>Activity Logs</span>
          </CardTitle>
          <CardDescription>View all system activities, errors, and campaign events</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search logs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                {uniqueActions.map((action) => (
                  <SelectItem key={action} value={action}>
                    {action.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={exportLogs} disabled={filteredLogs.length === 0}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold">{logs.length}</div>
              <div className="text-xs text-muted-foreground">Total Events</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-500">
                {logs.filter((l) => l.action === "error_occurred").length}
              </div>
              <div className="text-xs text-muted-foreground">Errors</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-500">
                {logs.filter((l) => l.action === "campaign_completed").length}
              </div>
              <div className="text-xs text-muted-foreground">Campaigns</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-500">
                {logs.filter((l) => l.action === "message_sent").length}
              </div>
              <div className="text-xs text-muted-foreground">Messages</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Logs List */}
      <Card className="border-border/50 bg-card/50">
        <CardContent className="p-0">
          <ScrollArea className="h-96">
            {filteredLogs.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-center">
                  <Clock className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No logs found</p>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {filteredLogs.map((log) => (
                  <div key={log.id} className="p-4 hover:bg-muted/50 transition-colors">
                    <div className="flex items-start space-x-3">
                      <div className="mt-1">{getActionIcon(log.action)}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <Badge variant={getActionColor(log.action) as any} className="text-xs">
                            {log.action.replace(/_/g, " ")}
                          </Badge>
                          <span className="text-xs text-muted-foreground">{formatTimestamp(log.timestamp)}</span>
                        </div>
                        <div className="text-sm space-y-1">
                          {log.details && (
                            <div className="bg-muted/50 rounded p-2 text-xs font-mono">
                              <pre className="whitespace-pre-wrap break-words">
                                {JSON.stringify(log.details, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}
