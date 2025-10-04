import { NextResponse } from "next/server"

export async function GET() {
  return NextResponse.json({
    telnyx_api_key_exists: !!process.env.TELNYX_API_KEY,
    telnyx_phone_exists: !!process.env.TELNYX_PHONE_NUMBER,
    // Never log actual values for security!
    timestamp: new Date().toISOString(),
  })
}