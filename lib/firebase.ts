import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app"
import { getAuth, type Auth } from "firebase/auth"
import { getFirestore, type Firestore } from "firebase/firestore"

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyDemo-Key-For-Development-Only",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "demo-project.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "demo-project",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "demo-project.appspot.com",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "123456789",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:123456789:web:abcdef123456",
}

let firebaseApp: FirebaseApp | null = null
let firebaseAuth: Auth | null = null
let firebaseDb: Firestore | null = null
let initializationAttempted = false
let initializationFailed = false

const initializeFirebaseApp = (): FirebaseApp | null => {
  if (typeof window === "undefined") {
    return null // Server-side rendering
  }

  if (initializationFailed) {
    return null // Previous initialization failed
  }

  if (firebaseApp) {
    return firebaseApp // Already initialized
  }

  if (initializationAttempted) {
    return null // Currently initializing or failed
  }

  try {
    initializationAttempted = true

    // Check if we have real Firebase config (not demo values)
    const hasRealConfig =
      process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
      process.env.NEXT_PUBLIC_FIREBASE_API_KEY !== "AIzaSyDemo-Key-For-Development-Only"

    if (!hasRealConfig) {
      console.warn("[v0] Firebase environment variables not configured. Running in demo mode.")
      initializationFailed = true
      return null
    }

    firebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp()
    console.log("[v0] Firebase app initialized successfully")
    return firebaseApp
  } catch (error) {
    console.error("[v0] Firebase app initialization failed:", error)
    initializationFailed = true
    return null
  }
}

export const getFirebaseAuth = (): Auth | null => {
  if (typeof window === "undefined") return null

  if (firebaseAuth) return firebaseAuth

  const app = initializeFirebaseApp()
  if (!app) return null

  try {
    firebaseAuth = getAuth(app)
    console.log("[v0] Firebase Auth initialized successfully")
    return firebaseAuth
  } catch (error) {
    console.error("[v0] Firebase Auth initialization failed:", error)
    return null
  }
}

export const getFirebaseDb = (): Firestore | null => {
  if (typeof window === "undefined") return null

  if (firebaseDb) return firebaseDb

  const app = initializeFirebaseApp()
  if (!app) return null

  try {
    firebaseDb = getFirestore(app)
    console.log("[v0] Firebase Firestore initialized successfully")
    return firebaseDb
  } catch (error) {
    console.error("[v0] Firebase Firestore initialization failed:", error)
    return null
  }
}

export const isFirebaseInitialized = (): boolean => {
  return typeof window !== "undefined" && !initializationFailed && firebaseApp !== null
}

export const hasFirebaseConfig = (): boolean => {
  return !!(
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY !== "AIzaSyDemo-Key-For-Development-Only"
  )
}

export const auth = getFirebaseAuth()
export const db = getFirebaseDb()
