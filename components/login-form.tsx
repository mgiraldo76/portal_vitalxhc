"use client"

import type React from "react"

import { useState } from "react"
import { useAuth } from "@/hooks/use-auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { MessageSquare, Smartphone, AlertTriangle } from "lucide-react"

export function LoginForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isSignUp, setIsSignUp] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const { signIn, signUp, isInitialized } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      if (isSignUp) {
        await signUp(email, password)
      } else {
        await signIn(email, password)
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background grid-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        {/* Logo/Brand */}
        <div className="text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <div className="flex items-center space-x-1">
              <MessageSquare className="h-8 w-8 text-primary" />
              <Smartphone className="h-6 w-6 text-primary" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-balance">Campaign Portal</h1>
          <p className="text-muted-foreground mt-2">Professional SMS & WhatsApp campaign management</p>
        </div>

        {!isInitialized && (
          <Card className="border-destructive/50 bg-destructive/5">
            <CardContent className="pt-6">
              <div className="flex items-center space-x-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                <div>
                  <p className="font-medium">Firebase Configuration Required</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Please set up your Firebase environment variables in Project Settings to enable authentication.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center">{isSignUp ? "Create Account" : "Sign In"}</CardTitle>
            <CardDescription className="text-center">
              {isSignUp
                ? "Enter your details to create your account"
                : "Enter your credentials to access your campaigns"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="bg-input border-border"
                  disabled={!isInitialized}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="bg-input border-border"
                  disabled={!isInitialized}
                />
              </div>

              {error && <div className="text-destructive text-sm text-center">{error}</div>}

              <Button type="submit" className="w-full" disabled={loading || !isInitialized}>
                {!isInitialized
                  ? "Firebase Configuration Required"
                  : loading
                    ? "Please wait..."
                    : isSignUp
                      ? "Create Account"
                      : "Sign In"}
              </Button>
            </form>

            {isInitialized && (
              <div className="mt-4 text-center">
                <button
                  type="button"
                  onClick={() => setIsSignUp(!isSignUp)}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  {isSignUp ? "Already have an account? Sign in" : "Don't have an account? Sign up"}
                </button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
