import { type NextRequest, NextResponse } from "next/server"
import { config } from "@/lib/config"

// Telnyx configuration
const TELNYX_API_KEY = config.TELNYX_API_KEY
const TELNYX_PHONE_NUMBER = config.TELNYX_PHONE_NUMBER
// Telnyx configuration
//const TELNYX_API_KEY = process.env.TELNYX_API_KEY
//const TELNYX_PHONE_NUMBER = process.env.TELNYX_PHONE_NUMBER

export async function POST(request: NextRequest) {
  try {
    const { to, message } = await request.json()

    if (!to || !message) {
      return NextResponse.json({ error: "Phone number and message are required" }, { status: 400 })
    }

    if (!TELNYX_API_KEY || !TELNYX_PHONE_NUMBER) {
      return NextResponse.json(
        {
          error: "Telnyx configuration missing. Please add TELNYX_API_KEY and TELNYX_PHONE_NUMBER to your environment variables.",
        },
        { status: 500 },
      )
    }

    // Telnyx API endpoint
    const telnyxUrl = "https://api.telnyx.com/v2/messages"

    const payload = {
      from: TELNYX_PHONE_NUMBER,
      to: to,
      text: message,
    }

    const response = await fetch(telnyxUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${TELNYX_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })

    const result = await response.json()

    if (response.ok) {
      return NextResponse.json({
        success: true,
        messageId: result.data?.id,
        status: result.data?.status,
      })
    } else {
      return NextResponse.json(
        { error: result.errors?.[0]?.detail || "Failed to send SMS" },
        { status: response.status },
      )
    }
  } catch (error) {
    console.error("SMS sending error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}