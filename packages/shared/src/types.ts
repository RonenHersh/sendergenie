// ─── Workspace ────────────────────────────────────────────────────────────────

export type Plan = 'free' | 'starter' | 'pro' | 'business' | 'enterprise'

export type WhatsAppProvider = 'waapi' | 'meta'

export interface Workspace {
  id: string
  name: string
  slug: string
  plan: Plan
  whatsapp_provider: WhatsAppProvider
  whatsapp_config: WhatsAppConfig
  ai_enabled: boolean
  monthly_message_limit: number
  messages_sent_this_month: number
  created_at: string
}

export interface WhatsAppConfig {
  // WaAPI
  waapi_instance_id?: string
  waapi_token?: string
  // Meta Cloud API
  meta_phone_number_id?: string
  meta_access_token?: string
  meta_waba_id?: string
}

// ─── User ─────────────────────────────────────────────────────────────────────

export type UserRole = 'owner' | 'admin' | 'agent'

export interface User {
  id: string
  workspace_id: string
  email: string
  name: string
  role: UserRole
  avatar_url?: string
  created_at: string
}

// ─── Contact ──────────────────────────────────────────────────────────────────

export interface Contact {
  id: string
  workspace_id: string
  phone: string              // E.164 format: +972501234567
  name?: string
  email?: string
  tags: string[]
  opted_out: boolean
  opted_out_at?: string
  custom_fields: Record<string, string>
  created_at: string
}

// ─── Campaign ─────────────────────────────────────────────────────────────────

export type CampaignStatus = 'draft' | 'scheduled' | 'running' | 'paused' | 'done' | 'failed'

export interface Campaign {
  id: string
  workspace_id: string
  name: string
  status: CampaignStatus
  target_filter: CampaignFilter
  scheduled_at?: string
  started_at?: string
  completed_at?: string
  daily_limit: number
  delay_min_seconds: number
  delay_max_seconds: number
  created_by: string
  created_at: string
}

export interface CampaignFilter {
  tags?: string[]
  exclude_tags?: string[]
  exclude_replied?: boolean
  exclude_opted_out?: boolean
}

export interface CampaignMessage {
  id: string
  campaign_id: string
  step_order: number
  body: string
  media_url?: string
  delay_after_prev_minutes: number
}

// ─── Message ──────────────────────────────────────────────────────────────────

export type MessageDirection = 'inbound' | 'outbound'
export type MessageStatus = 'queued' | 'sent' | 'delivered' | 'read' | 'failed'
export type MessageSenderType = 'contact' | 'agent' | 'bot' | 'campaign'
export type MessageContentType = 'text' | 'image' | 'audio' | 'video' | 'document'

export interface Message {
  id: string
  workspace_id: string
  conversation_id: string
  contact_id: string
  direction: MessageDirection
  sender_type: MessageSenderType
  body: string
  media_url?: string
  media_type?: MessageContentType
  wa_message_id?: string
  status: MessageStatus
  is_note: boolean
  ai_generated: boolean
  created_at: string
}

// ─── Conversation ─────────────────────────────────────────────────────────────

export type ConversationStatus = 'open' | 'resolved' | 'bot'

export interface Conversation {
  id: string
  workspace_id: string
  contact_id: string
  assigned_to?: string
  status: ConversationStatus
  last_message_at?: string
  last_message_preview?: string
  unread_count: number
  ai_auto_reply: boolean
  created_at: string
  // Joined
  contact?: Contact
  assigned_user?: User
}

// ─── Lead ─────────────────────────────────────────────────────────────────────

export interface Lead {
  id: string
  workspace_id: string
  contact_id: string
  conversation_id: string
  name?: string
  phone?: string
  email?: string
  raw_data: Record<string, unknown>
  pushed_to?: string
  pushed_at?: string
  created_at: string
}

// ─── WhatsApp Webhook ─────────────────────────────────────────────────────────

export interface IncomingWhatsAppMessage {
  wa_message_id: string
  from: string             // phone number
  body: string
  type: MessageContentType
  media_url?: string
  timestamp: number
}

export interface WhatsAppStatusUpdate {
  wa_message_id: string
  status: 'sent' | 'delivered' | 'read' | 'failed'
  timestamp: number
}

// ─── Queue Jobs ───────────────────────────────────────────────────────────────

export interface SendMessageJob {
  workspace_id: string
  contact_id: string
  phone: string
  body: string
  media_url?: string
  campaign_id?: string
  message_job_id?: string
  message_id?: string
}

export interface AIReplyJob {
  workspace_id: string
  conversation_id: string
  contact_id: string
  incoming_message: string
}

export interface WebhookPushJob {
  workspace_id: string
  event: string
  payload: Record<string, unknown>
}
