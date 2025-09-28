"use client"

import type React from "react"

import { createContext, useContext, useEffect, useState } from "react"
import {
  type User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
} from "firebase/auth"
import { getFirebaseAuth, hasFirebaseConfig } from "@/lib/firebase"

interface AuthContextType {
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  isInitialized: boolean
  hasConfig: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [isInitialized, setIsInitialized] = useState(false)
  const [hasConfig, setHasConfig] = useState(false)

  useEffect(() => {
    const configExists = hasFirebaseConfig()
    setHasConfig(configExists)

    if (!configExists) {
      console.warn("[v0] Firebase configuration missing")
      setLoading(false)
      setIsInitialized(false)
      return
    }

    const auth = getFirebaseAuth()

    if (!auth) {
      console.warn("[v0] Firebase Auth service unavailable")
      setLoading(false)
      setIsInitialized(false)
      return
    }

    setIsInitialized(true)

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      console.log("[v0] Auth state changed:", user ? "logged in" : "logged out")
      setUser(user)
      setLoading(false)
    })

    return unsubscribe
  }, [])

  const signIn = async (email: string, password: string) => {
    const auth = getFirebaseAuth()
    if (!auth) {
      throw new Error("Firebase not initialized. Please check your configuration.")
    }
    await signInWithEmailAndPassword(auth, email, password)
  }

  const signUp = async (email: string, password: string) => {
    const auth = getFirebaseAuth()
    if (!auth) {
      throw new Error("Firebase not initialized. Please check your configuration.")
    }
    await createUserWithEmailAndPassword(auth, email, password)
  }

  const logout = async () => {
    const auth = getFirebaseAuth()
    if (!auth) {
      throw new Error("Firebase not initialized. Please check your configuration.")
    }
    await signOut(auth)
  }

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, logout, isInitialized, hasConfig }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
