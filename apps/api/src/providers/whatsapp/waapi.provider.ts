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
    if (!payload || typeof payload !== 'object') return [{ type: 'unknown' }]

    const top = payload as Record<string, unknown>

    // Unwrap nested payload: could be { message: { message: {...} } } or { data: {...} } or flat
    function unwrap(obj: Record<string, unknown>): Record<string, unknown> {
      if (obj['message'] && typeof obj['message'] === 'object') {
        const inner = obj['message'] as Record<string, unknown>
        // If still nested (has message key again), go deeper
        if (inner['message'] && typeof inner['message'] === 'object') {
          return inner['message'] as Record<string, unknown>
        }
        return inner
      }
      if (obj['data'] && typeof obj['data'] === 'object') {
        return obj['data'] as Record<string, unknown>
      }
      return obj
    }
    const msgData = unwrap(top)

    console.log('[WaAPI] msgData keys:', Object.keys(msgData).join(', '))
    console.log('[WaAPI] fromMe:', msgData['fromMe'], 'type:', msgData['type'], 'body:', msgData['body'], 'from:', msgData['from'])

    const fromMe = msgData['fromMe'] === true
    const msgType = String(msgData['type'] ?? '')
    const body = String(msgData['body'] ?? '')
    const rawFrom = String(msgData['from'] ?? '')
      .replace(/@c\.us$/, '')
      .replace(/@s\.whatsapp\.net$/, '')
      .replace(/@lid$/, '')

    // Incoming text/chat message
    if (!fromMe && rawFrom && body && (msgType === 'chat' || msgType === 'text' || msgType === 'message')) {
      const idObj = msgData['id'] as Record<string, unknown> | undefined
      const waMessageId = String(idObj?.['_serialized'] ?? idObj?.['id'] ?? '')
      const from = rawFrom.startsWith('+') ? rawFrom : `+${rawFrom}`

      return [{
        type: 'message',
        data: {
          wa_message_id: waMessageId,
          from,
          body,
          type: 'text',
          timestamp: Number(msgData['timestamp'] ?? Date.now() / 1000),
        } satisfies IncomingWebhookMessage,
      }]
    }

    // ACK / status update
    const ackValue = msgData['ack']
    if (ackValue !== undefined && fromMe) {
      const ack = Number(ackValue)
      const statusMap: Record<number, WebhookStatusUpdate['status']> = {
        1: 'sent', 2: 'delivered', 3: 'read', [-1]: 'failed',
      }
      const status = statusMap[ack] ?? 'sent'
      const idObj = msgData['id'] as Record<string, unknown> | undefined
      const msgId = String(idObj?.['_serialized'] ?? idObj?.['id'] ?? '')
      if (msgId) {
        return [{
          type: 'status',
          data: { wa_message_id: msgId, status, timestamp: Date.now() / 1000 } satisfies WebhookStatusUpdate,
        }]
      }
    }

    return [{ type: 'unknown' }]
  }
}
