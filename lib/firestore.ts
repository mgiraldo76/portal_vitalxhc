import { db } from "./firebase"
import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  query,
  orderBy,
  limit,
  startAfter,
  where,
  type Timestamp,
} from "firebase/firestore"

export interface Campaign {
  id?: string
  name: string
  description: string
  methods: ("sms" | "whatsapp")[]
  message_text: string
  created_datetime: Timestamp
  end_datetime?: Timestamp
  created_by: string
  status: "draft" | "sending" | "completed"
}

export interface Recipient {
  id?: string
  name: string
  telephone: string
  email: string
  interests: string[]
  created_datetime: Timestamp
  updated_datetime: Timestamp
}

export interface CampaignRecipient {
  id?: string
  campaign_id: string
  recipient_id: string
  status: "pending" | "sent" | "failed"
  sent_datetime?: Timestamp
  attempts: number
  error_message?: string
}

export interface UserEventLog {
  id?: string
  user_id: string
  action: string
  details: any
  timestamp: Timestamp
  campaign_id?: string
}

// Helper function to check db initialization
function ensureDb() {
  if (!db) {
    throw new Error("Firebase is not initialized. Please check your Firebase configuration.")
  }
  return db
}

// Campaign functions
export async function createCampaign(campaign: Omit<Campaign, "id">) {
  const database = ensureDb()
  const docRef = await addDoc(collection(database, "campaigns"), campaign)
  return docRef.id
}

export async function getCampaigns(userId: string, pageSize = 15, lastDoc?: any) {
  const database = ensureDb()
  let q = query(
    collection(database, "campaigns"),
    where("created_by", "==", userId),
    orderBy("created_datetime", "desc"),
    limit(pageSize),
  )

  if (lastDoc) {
    q = query(q, startAfter(lastDoc))
  }

  const snapshot = await getDocs(q)
  const campaigns = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Campaign[]

  return {
    campaigns,
    lastDoc: snapshot.docs[snapshot.docs.length - 1],
  }
}

export async function updateCampaign(campaignId: string, updates: Partial<Campaign>) {
  const database = ensureDb()
  const campaignRef = doc(database, "campaigns", campaignId)
  await updateDoc(campaignRef, updates)
}

// Recipient functions
export async function createRecipient(recipient: Omit<Recipient, "id">) {
  const database = ensureDb()
  const docRef = await addDoc(collection(database, "recipients"), recipient)
  return docRef.id
}

export async function getRecipientByPhone(telephone: string) {
  const database = ensureDb()
  const q = query(collection(database, "recipients"), where("telephone", "==", telephone), limit(1))
  const snapshot = await getDocs(q)
  return snapshot.empty ? null : ({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Recipient)
}

export async function updateRecipient(recipientId: string, updates: Partial<Recipient>) {
  const database = ensureDb()
  const recipientRef = doc(database, "recipients", recipientId)
  await updateDoc(recipientRef, updates)
}

export async function getRecipients(pageSize = 50) {
  const database = ensureDb()
  const q = query(collection(database, "recipients"), orderBy("created_datetime", "desc"), limit(pageSize))
  const snapshot = await getDocs(q)
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Recipient[]
}

// Campaign Recipients functions
export async function addCampaignRecipients(campaignId: string, recipientIds: string[]) {
  const database = ensureDb()
  const promises = recipientIds.map((recipientId) =>
    addDoc(collection(database, "campaign_recipients"), {
      campaign_id: campaignId,
      recipient_id: recipientId,
      status: "pending",
      attempts: 0,
    }),
  )
  await Promise.all(promises)
}

export async function getCampaignRecipients(campaignId: string) {
  const database = ensureDb()
  const q = query(collection(database, "campaign_recipients"), where("campaign_id", "==", campaignId))
  const snapshot = await getDocs(q)
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as CampaignRecipient[]
}

// Logging function
export async function logUserEvent(event: Omit<UserEventLog, "id">) {
  const database = ensureDb()
  await addDoc(collection(database, "user_event_log"), event)
}