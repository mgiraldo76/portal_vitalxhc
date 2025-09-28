"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/hooks/use-auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { LogOut, MessageSquare, Users, BarChart3, Settings } from "lucide-react"
import { CampaignsPage } from "@/components/campaigns-page"
import { LogsViewer } from "@/components/logs-viewer"
import { getCampaigns, getRecipients } from "@/lib/firestore"

type Page = "dashboard" | "campaigns" | "logs"

export function Dashboard() {
  const { user, logout } = useAuth()
  const [currentPage, setCurrentPage] = useState<Page>("dashboard")
  const [stats, setStats] = useState({
    totalCampaigns: 0,
    totalRecipients: 0,
    messagesSent: 0,
    successRate: 0,
  })

  useEffect(() => {
    if (currentPage === "dashboard") {
      loadStats()
    }
  }, [currentPage, user])

  const loadStats = async () => {
    if (!user) return

    try {
      const [campaignsResult, recipients] = await Promise.all([
        getCampaigns(user.uid, 100), // Get more campaigns for accurate count
        getRecipients(1000), // Get more recipients for accurate count
      ])

      // Calculate basic stats
      const completedCampaigns = campaignsResult.campaigns.filter((c) => c.status === "completed")

      setStats({
        totalCampaigns: campaignsResult.campaigns.length,
        totalRecipients: recipients.length,
        messagesSent: completedCampaigns.length * 10, // Placeholder calculation
        successRate: completedCampaigns.length > 0 ? 95 : 0, // Placeholder calculation
      })
    } catch (error) {
      console.error("Error loading stats:", error)
    }
  }

  const handleLogout = async () => {
    await logout()
  }

  const navigateToCampaigns = () => {
    setCurrentPage("campaigns")
  }

  return (
    <div className="min-h-screen bg-background grid-bg">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/30 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <MessageSquare className="h-6 w-6 text-primary" />
                <h1 className="text-xl font-semibold">Campaign Portal</h1>
              </div>

              {/* Navigation */}
              <nav className="hidden md:flex items-center space-x-6 ml-8">
                <button
                  onClick={() => setCurrentPage("dashboard")}
                  className={`text-sm font-medium transition-colors ${
                    currentPage === "dashboard" ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Dashboard
                </button>
                <button
                  onClick={() => setCurrentPage("campaigns")}
                  className={`text-sm font-medium transition-colors ${
                    currentPage === "campaigns" ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Campaigns
                </button>
                <button
                  onClick={() => setCurrentPage("logs")}
                  className={`text-sm font-medium transition-colors ${
                    currentPage === "logs" ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Activity Logs
                </button>
              </nav>
            </div>

            <div className="flex items-center space-x-4">
              <span className="text-sm text-muted-foreground">{user?.email}</span>
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {currentPage === "dashboard" && <DashboardContent stats={stats} onNavigateToCampaigns={navigateToCampaigns} />}
        {currentPage === "campaigns" && <CampaignsPage />}
        {currentPage === "logs" && <LogsViewer />}
      </main>
    </div>
  )
}

function DashboardContent({
  stats,
  onNavigateToCampaigns,
}: {
  stats: { totalCampaigns: number; totalRecipients: number; messagesSent: number; successRate: number }
  onNavigateToCampaigns: () => void
}) {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold text-balance">Welcome to your Campaign Portal</h2>
        <p className="text-muted-foreground mt-2">Manage your SMS and WhatsApp campaigns with ease</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-border/50 bg-card/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Campaigns</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCampaigns}</div>
            <p className="text-xs text-muted-foreground">
              {stats.totalCampaigns === 0 ? "No campaigns yet" : "Active campaigns"}
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recipients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalRecipients}</div>
            <p className="text-xs text-muted-foreground">
              {stats.totalRecipients === 0 ? "Upload your first list" : "Total contacts"}
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Messages Sent</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.messagesSent}</div>
            <p className="text-xs text-muted-foreground">
              {stats.messagesSent === 0 ? "Start your first campaign" : "Total messages delivered"}
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.successRate > 0 ? `${stats.successRate}%` : "--"}</div>
            <p className="text-xs text-muted-foreground">
              {stats.successRate === 0 ? "No data available" : "Delivery success rate"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="border-border/50 bg-card/50">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Get started with your campaign management</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button
              className="h-auto p-4 justify-start bg-transparent"
              variant="outline"
              onClick={onNavigateToCampaigns}
            >
              <div className="text-left">
                <div className="font-medium">Create Campaign</div>
                <div className="text-sm text-muted-foreground">Start a new SMS or WhatsApp campaign</div>
              </div>
            </Button>
            <Button
              className="h-auto p-4 justify-start bg-transparent"
              variant="outline"
              onClick={onNavigateToCampaigns}
            >
              <div className="text-left">
                <div className="font-medium">Upload Recipients</div>
                <div className="text-sm text-muted-foreground">Import your contact list from CSV or Excel</div>
              </div>
            </Button>
            <Button className="h-auto p-4 justify-start bg-transparent" variant="outline">
              <div className="text-left">
                <div className="font-medium">View Activity Logs</div>
                <div className="text-sm text-muted-foreground">Monitor system activities and errors</div>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
