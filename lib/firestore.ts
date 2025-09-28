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

// Campaign functions
export async function createCampaign(campaign: Omit<Campaign, "id">) {
  const docRef = await addDoc(collection(db, "campaigns"), campaign)
  return docRef.id
}

export async function getCampaigns(userId: string, pageSize = 15, lastDoc?: any) {
  let q = query(
    collection(db, "campaigns"),
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
  const campaignRef = doc(db, "campaigns", campaignId)
  await updateDoc(campaignRef, updates)
}

// Recipient functions
export async function createRecipient(recipient: Omit<Recipient, "id">) {
  const docRef = await addDoc(collection(db, "recipients"), recipient)
  return docRef.id
}

export async function getRecipientByPhone(telephone: string) {
  const q = query(collection(db, "recipients"), where("telephone", "==", telephone), limit(1))
  const snapshot = await getDocs(q)
  return snapshot.empty ? null : ({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Recipient)
}

export async function updateRecipient(recipientId: string, updates: Partial<Recipient>) {
  const recipientRef = doc(db, "recipients", recipientId)
  await updateDoc(recipientRef, updates)
}

export async function getRecipients(pageSize = 50) {
  const q = query(collection(db, "recipients"), orderBy("created_datetime", "desc"), limit(pageSize))
  const snapshot = await getDocs(q)
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Recipient[]
}

// Campaign Recipients functions
export async function addCampaignRecipients(campaignId: string, recipientIds: string[]) {
  const promises = recipientIds.map((recipientId) =>
    addDoc(collection(db, "campaign_recipients"), {
      campaign_id: campaignId,
      recipient_id: recipientId,
      status: "pending",
      attempts: 0,
    }),
  )
  await Promise.all(promises)
}

export async function getCampaignRecipients(campaignId: string) {
  const q = query(collection(db, "campaign_recipients"), where("campaign_id", "==", campaignId))
  const snapshot = await getDocs(q)
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as CampaignRecipient[]
}

// Logging function
export async function logUserEvent(event: Omit<UserEventLog, "id">) {
  await addDoc(collection(db, "user_event_log"), event)
}
