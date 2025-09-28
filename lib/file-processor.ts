import { createRecipient, getRecipientByPhone, updateRecipient, logUserEvent } from "./firestore"
import { Timestamp } from "firebase/firestore"

export interface ProcessedRecipient {
  name: string
  telephone: string
  email: string
  interests: string[]
}

export interface ProcessingResult {
  success: boolean
  processed: number
  updated: number
  created: number
  errors: string[]
  duplicates: number
}

// Parse CSV content
export function parseCSV(content: string): ProcessedRecipient[] {
  const lines = content.split("\n").filter((line) => line.trim())
  if (lines.length < 2) {
    throw new Error("File must contain at least a header row and one data row")
  }

  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase())

  // Validate required headers
  const requiredHeaders = ["name", "telephone", "email", "interest"]
  const missingHeaders = requiredHeaders.filter((header) => !headers.some((h) => h.includes(header)))

  if (missingHeaders.length > 0) {
    throw new Error(
      `Missing required columns: ${missingHeaders.join(", ")}. Required: Name, Telephone, Email, Interest`,
    )
  }

  // Find column indices
  const nameIndex = headers.findIndex((h) => h.includes("name"))
  const phoneIndex = headers.findIndex((h) => h.includes("telephone") || h.includes("phone"))
  const emailIndex = headers.findIndex((h) => h.includes("email"))
  const interestIndex = headers.findIndex((h) => h.includes("interest"))

  const recipients: ProcessedRecipient[] = []
  const errors: string[] = []

  // Process data rows
  for (let i = 1; i < lines.length; i++) {
    const row = lines[i].split(",").map((cell) => cell.trim().replace(/"/g, ""))

    if (row.length < Math.max(nameIndex, phoneIndex, emailIndex, interestIndex) + 1) {
      errors.push(`Row ${i + 1}: Insufficient columns`)
      continue
    }

    const name = row[nameIndex]?.trim()
    const telephone = row[phoneIndex]?.trim()
    const email = row[emailIndex]?.trim()
    const interestStr = row[interestIndex]?.trim()

    // Validate required fields
    if (!name || !telephone || !email) {
      errors.push(`Row ${i + 1}: Missing required fields (name, telephone, or email)`)
      continue
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      errors.push(`Row ${i + 1}: Invalid email format: ${email}`)
      continue
    }

    // Validate phone format (basic validation)
    const phoneRegex = /^[+]?[1-9][\d]{3,14}$/
    const cleanPhone = telephone.replace(/[\s\-$$$$]/g, "")
    if (!phoneRegex.test(cleanPhone)) {
      errors.push(`Row ${i + 1}: Invalid phone format: ${telephone}`)
      continue
    }

    // Parse interests
    const interests = interestStr
      ? interestStr
          .split(",")
          .map((i) => i.trim())
          .filter((i) => i.length > 0)
      : []

    recipients.push({
      name,
      telephone: cleanPhone,
      email: email.toLowerCase(),
      interests,
    })
  }

  if (errors.length > 0) {
    throw new Error(`File processing errors:\n${errors.join("\n")}`)
  }

  return recipients
}

// Parse Excel content (simplified - in production you'd use a library like xlsx)
export function parseExcel(file: File): Promise<ProcessedRecipient[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        // For now, we'll treat Excel files as CSV
        // In production, you'd use a library like 'xlsx' to properly parse Excel files
        const content = e.target?.result as string
        const recipients = parseCSV(content)
        resolve(recipients)
      } catch (error) {
        reject(error)
      }
    }

    reader.onerror = () => reject(new Error("Failed to read file"))
    reader.readAsText(file)
  })
}

// Process and save recipients to Firestore
export async function processRecipients(recipients: ProcessedRecipient[], userId: string): Promise<ProcessingResult> {
  const result: ProcessingResult = {
    success: true,
    processed: 0,
    updated: 0,
    created: 0,
    errors: [],
    duplicates: 0,
  }

  const processedPhones = new Set<string>()

  for (const recipient of recipients) {
    try {
      // Check for duplicates within the file
      if (processedPhones.has(recipient.telephone)) {
        result.duplicates++
        continue
      }
      processedPhones.add(recipient.telephone)

      // Check if recipient exists in database
      const existingRecipient = await getRecipientByPhone(recipient.telephone)

      if (existingRecipient) {
        // Update existing recipient
        await updateRecipient(existingRecipient.id!, {
          name: recipient.name,
          email: recipient.email,
          interests: recipient.interests,
          updated_datetime: Timestamp.now(),
        })
        result.updated++
      } else {
        // Create new recipient
        await createRecipient({
          name: recipient.name,
          telephone: recipient.telephone,
          email: recipient.email,
          interests: recipient.interests,
          created_datetime: Timestamp.now(),
          updated_datetime: Timestamp.now(),
        })
        result.created++
      }

      result.processed++
    } catch (error) {
      result.errors.push(`Error processing ${recipient.name}: ${error}`)
      result.success = false
    }
  }

  // Log the upload event
  try {
    await logUserEvent({
      user_id: userId,
      action: "recipients_uploaded",
      details: {
        total_processed: result.processed,
        created: result.created,
        updated: result.updated,
        duplicates: result.duplicates,
        errors: result.errors.length,
      },
      timestamp: Timestamp.now(),
    })
  } catch (error) {
    console.error("Error logging upload event:", error)
  }

  return result
}

// Main file processing function
export async function processFile(file: File, userId: string): Promise<ProcessingResult> {
  try {
    let recipients: ProcessedRecipient[]

    if (file.type === "text/csv" || file.name.endsWith(".csv")) {
      const content = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = (e) => resolve(e.target?.result as string)
        reader.onerror = () => reject(new Error("Failed to read CSV file"))
        reader.readAsText(file)
      })
      recipients = parseCSV(content)
    } else if (
      file.type === "application/vnd.ms-excel" ||
      file.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
      file.name.endsWith(".xlsx") ||
      file.name.endsWith(".xls")
    ) {
      recipients = await parseExcel(file)
    } else {
      throw new Error("Unsupported file type. Please use CSV or Excel files.")
    }

    return await processRecipients(recipients, userId)
  } catch (error) {
    return {
      success: false,
      processed: 0,
      updated: 0,
      created: 0,
      errors: [error instanceof Error ? error.message : "Unknown error occurred"],
      duplicates: 0,
    }
  }
}
