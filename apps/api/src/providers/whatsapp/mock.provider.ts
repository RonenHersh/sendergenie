/**
 * Mock WhatsApp Provider — for development without WaAPI/Meta
 * Logs all outbound messages to console instead of sending them.
 * Returns realistic success responses so all app logic works normally.
 */

import type {
  WhatsAppProvider, SendTextResult, SendMediaResult, WebhookEvent
} from './types.js'

export class MockWhatsAppProvider implements WhatsAppProvider {
  private readonly label = '[MockWhatsApp]'

  async sendText(to: string, message: string): Promise<SendTextResult> {
    const waMessageId = `mock_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    console.log(`\n${this.label} 📤 TEXT → ${to}`)
    console.log(`  "${message}"`)
    console.log(`  wa_message_id: ${waMessageId}\n`)
    return { wa_message_id: waMessageId, status: 'sent' }
  }

  async sendImage(to: string, imageUrl: string, caption?: string): Promise<SendMediaResult> {
    const waMessageId = `mock_img_${Date.now()}`
    console.log(`\n${this.label} 🖼️  IMAGE → ${to}`)
    console.log(`  url: ${imageUrl}`)
    if (caption) console.log(`  caption: "${caption}"`)
    return { wa_message_id: waMessageId, status: 'sent' }
  }

  async sendDocument(to: string, docUrl: string, filename: string): Promise<SendMediaResult> {
    const waMessageId = `mock_doc_${Date.now()}`
    console.log(`\n${this.label} 📄 DOC → ${to}: ${filename}`)
    return { wa_message_id: waMessageId, status: 'sent' }
  }

  parseWebhook(_payload: unknown): WebhookEvent[] {
    return [{ type: 'unknown' }]
  }
}
