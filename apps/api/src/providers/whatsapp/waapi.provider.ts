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
      // If 'to' already contains @, use as-is (WaAPI JID format)
      const chatId = to.includes('@') ? to : `${to.replace('+', '')}@c.us`
      const res = await axios.post(
        `${this.baseUrl}/client/action/send-message`,
        { chatId, message },
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

  async sendTyping(to: string): Promise<void> {
    try {
      const chatId = to.includes('@') ? to : `${to.replace('+', '')}@c.us`
      await axios.post(
        `${this.baseUrl}/client/action/send-presence`,
        { chatId, presence: 'composing' },
        { headers: this.headers }
      )
    } catch {
      // Typing indicator is best-effort — ignore errors
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

    // WaAPI v1.7+ sends: { event, instanceId, data: { message: {...}, media: null } }
    // Unwrap: follow data → message chain until we find body/from/type
    function unwrap(obj: Record<string, unknown>): Record<string, unknown> {
      let cur = obj
      // Follow 'data' key if present
      if (cur['data'] && typeof cur['data'] === 'object') {
        cur = cur['data'] as Record<string, unknown>
      }
      // Follow 'message' key repeatedly
      while (cur['message'] && typeof cur['message'] === 'object') {
        cur = cur['message'] as Record<string, unknown>
      }
      return cur
    }
    const msgData = unwrap(top)

    console.log('[WaAPI] msgData keys:', Object.keys(msgData).join(', '))
    console.log('[WaAPI] fromMe:', msgData['fromMe'], 'type:', msgData['type'], 'body:', msgData['body'], 'from:', msgData['from'])

    const fromMe = msgData['fromMe'] === true
    const msgType = String(msgData['type'] ?? '')
    const body = String(msgData['body'] ?? '')

    // WaAPI may return @lid (internal ID) instead of @c.us (phone number)
    const rawFromJid = String(msgData['from'] ?? '')
    const isLid = rawFromJid.endsWith('@lid')

    // For @lid contacts, use the JID directly as phone (WaAPI accepts it for sending)
    // For @c.us contacts, extract the phone number
    const from = isLid
      ? rawFromJid  // keep full JID e.g. "42924507185161@lid"
      : (() => {
          const num = rawFromJid.replace(/@c\.us$/, '').replace(/@s\.whatsapp\.net$/, '')
          return num.startsWith('+') ? num : `+${num}`
        })()

    const rawFrom = from // used for empty check below

    // Incoming text/chat message
    if (!fromMe && rawFrom && body && (msgType === 'chat' || msgType === 'text' || msgType === 'message')) {
      const idObj = msgData['id'] as Record<string, unknown> | undefined
      const waMessageId = String(idObj?.['_serialized'] ?? idObj?.['id'] ?? '')
      const _data = msgData['_data'] as Record<string, unknown> | undefined
      const name = String(_data?.['notifyName'] ?? msgData['notifyName'] ?? '').trim() || undefined

      return [{
        type: 'message',
        data: {
          wa_message_id: waMessageId,
          from,
          name,
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
