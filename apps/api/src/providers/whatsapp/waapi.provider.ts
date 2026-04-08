/**
 * WaAPI Provider (unofficial WhatsApp)
 * Docs: https://waapi.app
 * Used for development and early-stage customers.
 * Replace with Meta Cloud API for production.
 */

import axios from 'axios'
import type {
  WhatsAppProvider,
  SendTextResult,
  SendMediaResult,
  WebhookEvent,
  IncomingWebhookMessage,
  WebhookStatusUpdate,
} from './types.js'

interface WaAPIConfig {
  instance_id: string
  token: string
  base_url?: string
}

export class WaAPIProvider implements WhatsAppProvider {
  private readonly baseUrl: string
  private readonly headers: Record<string, string>

  constructor(config: WaAPIConfig) {
    this.baseUrl = `${config.base_url ?? 'https://waapi.app/api/v1'}/instances/${config.instance_id}`
    this.headers = {
      Authorization: `Bearer ${config.token}`,
      'Content-Type': 'application/json',
    }
  }

  async sendText(to: string, message: string): Promise<SendTextResult> {
    try {
      const res = await axios.post(
        `${this.baseUrl}/client/action/send-message`,
        { chatId: `${to.replace('+', '')}@c.us`, message },
        { headers: this.headers }
      )

      const waMessageId = res.data?.data?.id?._serialized ?? res.data?.data?.id ?? 'unknown'

      return { wa_message_id: waMessageId, status: 'sent' }
    } catch (err: unknown) {
      const error = err instanceof Error ? err.message : 'Unknown error'
      return { wa_message_id: '', status: 'failed', error }
    }
  }

  async sendImage(to: string, imageUrl: string, caption?: string): Promise<SendMediaResult> {
    try {
      const res = await axios.post(
        `${this.baseUrl}/client/action/send-media`,
        {
          chatId: `${to.replace('+', '')}@c.us`,
          mediaUrl: imageUrl,
          mediaCaption: caption ?? '',
          mediaType: 'image',
        },
        { headers: this.headers }
      )

      const waMessageId = res.data?.data?.id?._serialized ?? 'unknown'
      return { wa_message_id: waMessageId, status: 'sent' }
    } catch (err: unknown) {
      const error = err instanceof Error ? err.message : 'Unknown error'
      return { wa_message_id: '', status: 'failed', error }
    }
  }

  async sendDocument(to: string, docUrl: string, filename: string): Promise<SendMediaResult> {
    try {
      const res = await axios.post(
        `${this.baseUrl}/client/action/send-media`,
        {
          chatId: `${to.replace('+', '')}@c.us`,
          mediaUrl: docUrl,
          mediaCaption: filename,
          mediaType: 'document',
        },
        { headers: this.headers }
      )

      const waMessageId = res.data?.data?.id?._serialized ?? 'unknown'
      return { wa_message_id: waMessageId, status: 'sent' }
    } catch (err: unknown) {
      const error = err instanceof Error ? err.message : 'Unknown error'
      return { wa_message_id: '', status: 'failed', error }
    }
  }

  parseWebhook(payload: unknown): WebhookEvent[] {
    const events: WebhookEvent[] = []

    if (!payload || typeof payload !== 'object') return [{ type: 'unknown' }]

    const data = payload as Record<string, unknown>

    // WaAPI sends events in .data array
    const rawEvents = Array.isArray(data['data']) ? data['data'] : [data]

    for (const event of rawEvents) {
      if (typeof event !== 'object' || !event) continue
      const e = event as Record<string, unknown>

      if (e['event'] === 'message' || e['type'] === 'message') {
        const msg = e['data'] as Record<string, unknown> | undefined
        if (!msg) continue

        const from = String(msg['from'] ?? '').replace('@c.us', '').replace('@s.whatsapp.net', '')

        events.push({
          type: 'message',
          data: {
            wa_message_id: String(msg['id'] ?? ''),
            from: from.startsWith('+') ? from : `+${from}`,
            body: String(msg['body'] ?? ''),
            type: 'text',
            timestamp: Number(msg['timestamp'] ?? Date.now() / 1000),
          } satisfies IncomingWebhookMessage,
        })
      } else if (e['event'] === 'ack' || e['ack'] !== undefined) {
        const ack = Number((e['data'] as Record<string, unknown>)?.['ack'] ?? e['ack'])
        const statusMap: Record<number, WebhookStatusUpdate['status']> = {
          1: 'sent',
          2: 'delivered',
          3: 'read',
          [-1]: 'failed',
        }
        const status = statusMap[ack] ?? 'sent'
        const msgId = String((e['data'] as Record<string, unknown>)?.['id'] ?? e['id'] ?? '')

        if (msgId) {
          events.push({
            type: 'status',
            data: {
              wa_message_id: msgId,
              status,
              timestamp: Date.now() / 1000,
            } satisfies WebhookStatusUpdate,
          })
        }
      }
    }

    return events.length ? events : [{ type: 'unknown' }]
  }
}
