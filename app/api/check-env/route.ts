import { NextResponse } from "next/server"
import { config } from "@/lib/config"

export async function GET() {
  return NextResponse.json({
    telnyx_api_key_exists: !!config.TELNYX_API_KEY,
    telnyx_phone_exists: !!config.TELNYX_PHONE_NUMBER,
    // TEMPORARY - REMOVE AFTER DEBUGGING
    telnyx_api_key_value: config.TELNYX_API_KEY,
    telnyx_phone_value: config.TELNYX_PHONE_NUMBER,
    timestamp: new Date().toISOString(),
  })
}