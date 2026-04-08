/**
 * Meta Cloud API Provider (official WhatsApp Business API)
 * This is the production provider — requires WABA approval.
 * Architecture is identical to WaAPIProvider so switching is seamless.
 */

import axios from 'axios'
import crypto from 'crypto'
import type {
  WhatsAppProvider,
  SendTextResult,
  SendMediaResult,
  WebhookEvent,
  IncomingWebhookMessage,
  WebhookStatusUpdate,
} from './types.js'

interface MetaConfig {
  phone_number_id: string
  access_token: string
  verify_token?: string
  app_secret?: string
}

const META_API_VERSION = 'v21.0'

export class MetaCloudProvider implements WhatsAppProvider {
  private readonly baseUrl: string
  private readonly headers: Record<string, string>
  private readonly verifyToken?: string
  private readonly appSecret?: string

  constructor(config: MetaConfig) {
    this.baseUrl = `https://graph.facebook.com/${META_API_VERSION}/${config.phone_number_id}`
    this.headers = {
      Authorization: `Bearer ${config.access_token}`,
      'Content-Type': 'application/json',
    }
    this.verifyToken = config.verify_token
    this.appSecret = config.app_secret
  }

  async sendText(to: string, message: string): Promise<SendTextResult> {
    try {
      const res = await axios.post(
        `${this.baseUrl}/messages`,
        {
          messaging_product: 'whatsapp',
          to: to.replace('+', ''),
          type: 'text',
          text: { preview_url: false, body: message },
        },
        { headers: this.headers }
      )

      const waMessageId = res.data?.messages?.[0]?.id ?? 'unknown'
      return { wa_message_id: waMessageId, status: 'sent' }
    } catch (err: unknown) {
      const error = err instanceof Error ? err.message : 'Unknown error'
      return { wa_message_id: '', status: 'failed', error }
    }
  }

  async sendImage(to: string, imageUrl: string, caption?: string): Promise<SendMediaResult> {
    try {
      const res = await axios.post(
        `${this.baseUrl}/messages`,
        {
          messaging_product: 'whatsapp',
          to: to.replace('+', ''),
          type: 'image',
          image: { link: imageUrl, caption: caption ?? '' },
        },
        { headers: this.headers }
      )

      const waMessageId = res.data?.messages?.[0]?.id ?? 'unknown'
      return { wa_message_id: waMessageId, status: 'sent' }
    } catch (err: unknown) {
      const error = err instanceof Error ? err.message : 'Unknown error'
      return { wa_message_id: '', status: 'failed', error }
    }
  }

  async sendDocument(to: string, docUrl: string, filename: string): Promise<SendMediaResult> {
    try {
      const res = await axios.post(
        `${this.baseUrl}/messages`,
        {
          messaging_product: 'whatsapp',
          to: to.replace('+', ''),
          type: 'document',
          document: { link: docUrl, filename },
        },
        { headers: this.headers }
      )

      const waMessageId = res.data?.messages?.[0]?.id ?? 'unknown'
      return { wa_message_id: waMessageId, status: 'sent' }
    } catch (err: unknown) {
      const error = err instanceof Error ? err.message : 'Unknown error'
      return { wa_message_id: '', status: 'failed', error }
    }
  }

  /**
   * Verify webhook challenge from Meta (GET request during setup)
   */
  verifyWebhookChallenge(query: Record<string, string>): string | null {
    const mode = query['hub.mode']
    const token = query['hub.verify_token']
    const challenge = query['hub.challenge']

    if (mode === 'subscribe' && token === this.verifyToken && challenge) {
      return challenge
    }
    return null
  }

  parseWebhook(payload: unknown, headers?: Record<string, string>): WebhookEvent[] {
    // Verify signature if app_secret is configured
    if (this.appSecret && headers?.['x-hub-signature-256']) {
      const sig = headers['x-hub-signature-256'].replace('sha256=', '')
      const expected = crypto
        .createHmac('sha256', this.appSecret)
        .update(JSON.stringify(payload))
        .digest('hex')

      if (sig !== expected) return [{ type: 'unknown' }]
    }

    const events: WebhookEvent[] = []
    const data = payload as Record<string, unknown>

    const entries = (data['entry'] as unknown[]) ?? []

    for (const entry of entries) {
      const e = entry as Record<string, unknown>
      const changes = (e['changes'] as unknown[]) ?? []

      for (const change of changes) {
        const c = change as Record<string, unknown>
        const value = c['value'] as Record<string, unknown>

        // Incoming messages
        const incomingMessages = (value['messages'] as unknown[]) ?? []
        for (const msg of incomingMessages) {
          const m = msg as Record<string, unknown>
          events.push({
            type: 'message',
            data: {
              wa_message_id: String(m['id'] ?? ''),
              from: `+${String(m['from'] ?? '')}`,
              body: (m['text'] as Record<string, unknown>)?.['body'] as string ?? '',
              type: String(m['type'] ?? 'text') as IncomingWebhookMessage['type'],
              timestamp: Number(m['timestamp'] ?? 0),
            } satisfies IncomingWebhookMessage,
          })
        }

        // Status updates
        const statuses = (value['statuses'] as unknown[]) ?? []
        for (const status of statuses) {
          const s = status as Record<string, unknown>
          const statusValue = String(s['status'] ?? '')
          if (['sent', 'delivered', 'read', 'failed'].includes(statusValue)) {
            events.push({
              type: 'status',
              data: {
                wa_message_id: String(s['id'] ?? ''),
                status: statusValue as WebhookStatusUpdate['status'],
                timestamp: Number(s['timestamp'] ?? 0),
              } satisfies WebhookStatusUpdate,
            })
          }
        }
      }
    }

    return events.length ? events : [{ type: 'unknown' }]
  }
}
