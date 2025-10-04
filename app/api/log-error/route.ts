import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const errorData = await request.json()
    
    // Log to Vercel Function Logs
    console.error("=== CLIENT ERROR LOGGED ===")
    console.error("Timestamp:", new Date().toISOString())
    console.error("Error Data:", JSON.stringify(errorData, null, 2))
    console.error("User Agent:", request.headers.get("user-agent"))
    console.error("==========================")
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to log client error:", error)
    return NextResponse.json({ success: false }, { status: 500 })
  }
}