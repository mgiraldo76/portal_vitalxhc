import { logUserEvent } from "./firestore"
import { Timestamp } from "firebase/firestore"

export interface ErrorContext {
  userId?: string
  action?: string
  campaignId?: string
  recipientId?: string
  component?: string
  additionalData?: any
}

export class AppError extends Error {
  public readonly code: string
  public readonly context: ErrorContext
  public readonly timestamp: Date

  constructor(message: string, code = "UNKNOWN_ERROR", context: ErrorContext = {}) {
    super(message)
    this.name = "AppError"
    this.code = code
    this.context = context
    this.timestamp = new Date()
  }
}

// Error codes for different types of errors
export const ERROR_CODES = {
  // Authentication errors
  AUTH_FAILED: "AUTH_FAILED",
  AUTH_REQUIRED: "AUTH_REQUIRED",

  // Campaign errors
  CAMPAIGN_NOT_FOUND: "CAMPAIGN_NOT_FOUND",
  CAMPAIGN_EXECUTION_FAILED: "CAMPAIGN_EXECUTION_FAILED",
  CAMPAIGN_INVALID_STATUS: "CAMPAIGN_INVALID_STATUS",

  // Recipient errors
  RECIPIENT_NOT_FOUND: "RECIPIENT_NOT_FOUND",
  RECIPIENT_INVALID_DATA: "RECIPIENT_INVALID_DATA",

  // File processing errors
  FILE_INVALID_FORMAT: "FILE_INVALID_FORMAT",
  FILE_PROCESSING_FAILED: "FILE_PROCESSING_FAILED",
  FILE_TOO_LARGE: "FILE_TOO_LARGE",

  // Messaging errors
  SMS_SEND_FAILED: "SMS_SEND_FAILED",
  WHATSAPP_SEND_FAILED: "WHATSAPP_SEND_FAILED",
  MESSAGE_INVALID_RECIPIENT: "MESSAGE_INVALID_RECIPIENT",

  // Database errors
  DATABASE_ERROR: "DATABASE_ERROR",
  PERMISSION_DENIED: "PERMISSION_DENIED",

  // Network errors
  NETWORK_ERROR: "NETWORK_ERROR",
  API_ERROR: "API_ERROR",

  // Validation errors
  VALIDATION_ERROR: "VALIDATION_ERROR",
  REQUIRED_FIELD_MISSING: "REQUIRED_FIELD_MISSING",
} as const

// Global error handler
export async function handleError(error: Error | AppError, context: ErrorContext = {}) {
  console.error("[Campaign Portal Error]", {
    message: error.message,
    code: error instanceof AppError ? error.code : "UNKNOWN_ERROR",
    context,
    stack: error.stack,
    timestamp: new Date().toISOString(),
  })

  // Log to Firestore if user context is available
  if (context.userId) {
    try {
      await logUserEvent({
        user_id: context.userId,
        action: "error_occurred",
        details: {
          error_message: error.message,
          error_code: error instanceof AppError ? error.code : "UNKNOWN_ERROR",
          component: context.component,
          action_context: context.action,
          campaign_id: context.campaignId,
          recipient_id: context.recipientId,
          additional_data: context.additionalData,
          stack_trace: error.stack?.substring(0, 1000), // Limit stack trace length
        },
        timestamp: Timestamp.now(),
        campaign_id: context.campaignId,
      })
    } catch (loggingError) {
      console.error("Failed to log error to Firestore:", loggingError)
    }
  }

  // Return user-friendly error message
  return getUserFriendlyMessage(error)
}

// Convert technical errors to user-friendly messages
export function getUserFriendlyMessage(error: Error | AppError): string {
  if (error instanceof AppError) {
    switch (error.code) {
      case ERROR_CODES.AUTH_FAILED:
        return "Authentication failed. Please check your credentials and try again."
      case ERROR_CODES.AUTH_REQUIRED:
        return "Please log in to continue."
      case ERROR_CODES.CAMPAIGN_NOT_FOUND:
        return "Campaign not found. It may have been deleted."
      case ERROR_CODES.CAMPAIGN_EXECUTION_FAILED:
        return "Failed to execute campaign. Please check your configuration and try again."
      case ERROR_CODES.FILE_INVALID_FORMAT:
        return "Invalid file format. Please upload a CSV or Excel file with the required columns."
      case ERROR_CODES.FILE_TOO_LARGE:
        return "File is too large. Please upload a file smaller than 20MB."
      case ERROR_CODES.SMS_SEND_FAILED:
        return "Failed to send SMS. Please check the phone number and try again."
      case ERROR_CODES.WHATSAPP_SEND_FAILED:
        return "Failed to send WhatsApp message. Please verify the configuration."
      case ERROR_CODES.NETWORK_ERROR:
        return "Network error. Please check your connection and try again."
      case ERROR_CODES.VALIDATION_ERROR:
        return "Please check your input and try again."
      default:
        return error.message || "An unexpected error occurred. Please try again."
    }
  }

  // Handle common Firebase errors
  if (error.message.includes("permission-denied")) {
    return "You don't have permission to perform this action."
  }
  if (error.message.includes("network-request-failed")) {
    return "Network error. Please check your connection and try again."
  }
  if (error.message.includes("quota-exceeded")) {
    return "Service quota exceeded. Please try again later."
  }

  return "An unexpected error occurred. Please try again."
}

// Wrapper for async operations with error handling
export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  context: ErrorContext = {},
): Promise<{ data?: T; error?: string }> {
  try {
    const data = await operation()
    return { data }
  } catch (error) {
    const errorMessage = await handleError(error as Error, context)
    return { error: errorMessage }
  }
}

// Validation helpers
export function validateRequired(value: any, fieldName: string, context: ErrorContext = {}) {
  if (!value || (typeof value === "string" && !value.trim())) {
    throw new AppError(`${fieldName} is required`, ERROR_CODES.REQUIRED_FIELD_MISSING, context)
  }
}

export function validateEmail(email: string, context: ErrorContext = {}) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    throw new AppError("Invalid email format", ERROR_CODES.VALIDATION_ERROR, context)
  }
}

export function validatePhone(phone: string, context: ErrorContext = {}) {
  const phoneRegex = /^[+]?[1-9][\d]{3,14}$/
  const cleanPhone = phone.replace(/[\s\-$$$$]/g, "")
  if (!phoneRegex.test(cleanPhone)) {
    throw new AppError("Invalid phone number format", ERROR_CODES.VALIDATION_ERROR, context)
  }
}
