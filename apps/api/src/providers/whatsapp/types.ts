export interface SendTextResult {
  wa_message_id: string
  status: 'sent' | 'failed'
  error?: string
}

export interface SendMediaResult extends SendTextResult {}

export interface IncomingWebhookMessage {
  wa_message_id: string
  from: string         // phone in E.164
  name?: string        // contact display name
  body: string
  type: 'text' | 'image' | 'audio' | 'video' | 'document'
  media_url?: string
  timestamp: number
}

export interface WebhookStatusUpdate {
  wa_message_id: string
  status: 'sent' | 'delivered' | 'read' | 'failed'
  timestamp: number
}

export type WebhookEvent =
  | { type: 'message'; data: IncomingWebhookMessage }
  | { type: 'status'; data: WebhookStatusUpdate }
  | { type: 'unknown' }

export interface WhatsAppProvider {
  sendText(to: string, message: string): Promise<SendTextResult>
  sendImage(to: string, imageUrl: string, caption?: string): Promise<SendMediaResult>
  sendDocument(to: string, docUrl: string, filename: string): Promise<SendMediaResult>
  sendTyping?(to: string): Promise<void>
  parseWebhook(payload: unknown, headers?: Record<string, string>): WebhookEvent[]
  verifyWebhookChallenge?(query: Record<string, string>): string | null
}
