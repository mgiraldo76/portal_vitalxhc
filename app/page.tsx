"use client"

import { useAuth } from "@/hooks/use-auth"
import { LoginForm } from "@/components/login-form"
import { Dashboard } from "@/components/dashboard"
import { LoadingSpinner } from "@/components/loading-spinner"

export default function Home() {
  const { user, loading, isInitialized } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-background grid-bg flex items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  if (!user || !isInitialized) {
    return <LoginForm />
  }

  return <Dashboard />
}
