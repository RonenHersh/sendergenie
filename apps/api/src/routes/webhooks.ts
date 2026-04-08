/**
 * /webhooks — receives incoming WhatsApp events
 * This is called by the WhatsApp provider (WaAPI or Meta) on every message/status update.
 */

import type { FastifyInstance } from 'fastify'
import { db } from '../db/index.js'
import { eq, and } from 'drizzle-orm'
import { workspaces, contacts, conversations, messages, messageJobs, campaigns } from '../db/schema.js'
import { getWhatsAppProvider } from '../providers/whatsapp/index.js'
import { aiReplyQueue } from '../lib/queues.js'
import { normalizePhone, isOptOutMessage } from '@sendergenie/shared'

export async function webhookRoutes(app: FastifyInstance): Promise<void> {

  // ── Meta Cloud API: webhook verification ──────────────────────────────────
  app.get('/webhooks/meta/:workspaceId', async (request, reply) => {
    const { workspaceId } = request.params as { workspaceId: string }
    const query = request.query as Record<string, string>

    const [workspace] = await db
      .select()
      .from(workspaces)
      .where(eq(workspaces.id, workspaceId))
      .limit(1)

    if (!workspace || workspace.whatsapp_provider !== 'meta') {
      return reply.status(404).send({ error: 'Workspace not found' })
    }

    const provider = getWhatsAppProvider(workspace)
    const challenge = provider.verifyWebhookChallenge?.(query)

    if (challenge) {
      return reply.send(challenge)
    }

    return reply.status(403).send({ error: 'Forbidden' })
  })

  // ── Incoming events (both WaAPI and Meta) ─────────────────────────────────
  app.post('/webhooks/:workspaceId', async (request, reply) => {
    const { workspaceId } = request.params as { workspaceId: string }

    const [workspace] = await db
      .select()
      .from(workspaces)
      .where(eq(workspaces.id, workspaceId))
      .limit(1)

    if (!workspace) {
      return reply.status(404).send({ error: 'Workspace not found' })
    }

    console.log('[Webhook] RAW PAYLOAD:', JSON.stringify(request.body, null, 2))

    const provider = getWhatsAppProvider(workspace)
    const events = provider.parseWebhook(
      request.body,
      request.headers as Record<string, string>
    )

    console.log('[Webhook] PARSED EVENTS:', JSON.stringify(events, null, 2))

    for (const event of events) {
      if (event.type === 'message') {
        await handleIncomingMessage(workspace.id, event.data)
      } else if (event.type === 'status') {
        await handleStatusUpdate(workspace.id, event.data)
      }
    }

    return reply.send({ ok: true })
  })
}

// ─── Handle incoming message ──────────────────────────────────────────────────

async function handleIncomingMessage(
  workspaceId: string,
  data: { wa_message_id: string; from: string; body: string; type: string; timestamp: number }
): Promise<void> {
  const phone = normalizePhone(data.from)
  if (!phone) return

  // Opt-out detection
  if (isOptOutMessage(data.body)) {
    await db
      .update(contacts)
      .set({ opted_out: true, opted_out_at: new Date() })
      .where(and(eq(contacts.workspace_id, workspaceId), eq(contacts.phone, phone)))
    console.log(`[Webhook] Opt-out from ${phone}`)
  }

  // Find or create contact
  let [contact] = await db
    .select()
    .from(contacts)
    .where(and(eq(contacts.workspace_id, workspaceId), eq(contacts.phone, phone)))
    .limit(1)

  if (!contact) {
    const [newContact] = await db
      .insert(contacts)
      .values({ workspace_id: workspaceId, phone, tags: [] })
      .returning()
    contact = newContact!
  }

  // Find or create conversation
  let [conversation] = await db
    .select()
    .from(conversations)
    .where(and(eq(conversations.workspace_id, workspaceId), eq(conversations.contact_id, contact.id)))
    .limit(1)

  if (!conversation) {
    const [newConversation] = await db
      .insert(conversations)
      .values({
        workspace_id: workspaceId,
        contact_id: contact.id,
        status: 'open',
        ai_auto_reply: true,
      })
      .returning()
    conversation = newConversation!
  }

  // Save message
  const [savedMessage] = await db
    .insert(messages)
    .values({
      workspace_id: workspaceId,
      conversation_id: conversation.id,
      contact_id: contact.id,
      direction: 'inbound',
      sender_type: 'contact',
      body: data.body,
      wa_message_id: data.wa_message_id,
      status: 'delivered',
    })
    .onConflictDoNothing() // prevent duplicate webhook events
    .returning()

  if (!savedMessage) return // duplicate event

  // Update conversation
  await db
    .update(conversations)
    .set({
      last_message_at: new Date(),
      last_message_preview: data.body.slice(0, 100),
      unread_count: conversation.unread_count + 1,
      updated_at: new Date(),
    })
    .where(eq(conversations.id, conversation.id))

  // Update campaign replied stats if this contact has a campaign message
  const [pendingJob] = await db
    .select({ campaign_id: messageJobs.campaign_id })
    .from(messageJobs)
    .where(and(
      eq(messageJobs.workspace_id, workspaceId),
      eq(messageJobs.contact_id, contact.id),
    ))
    .limit(1)

  if (pendingJob?.campaign_id) {
    await db
      .update(campaigns)
      .set({ replied: campaigns.replied })
      .where(eq(campaigns.id, pendingJob.campaign_id))
  }

  // Queue AI reply if enabled
  if (conversation.ai_auto_reply) {
    await aiReplyQueue.add(`reply:${conversation.id}`, {
      workspace_id: workspaceId,
      conversation_id: conversation.id,
      contact_id: contact.id,
      incoming_message: data.body,
    }, {
      delay: 2000, // 2 second "typing" delay before AI responds
    })
  }

  console.log(`[Webhook] Message from ${phone}: "${data.body.slice(0, 50)}"`)
}

// ─── Handle status update ─────────────────────────────────────────────────────

async function handleStatusUpdate(
  workspaceId: string,
  data: { wa_message_id: string; status: string; timestamp: number }
): Promise<void> {
  const statusMap = {
    sent: 'sent',
    delivered: 'delivered',
    read: 'read',
    failed: 'failed',
  } as const

  const status = statusMap[data.status as keyof typeof statusMap]
  if (!status) return

  // Update message status
  await db
    .update(messages)
    .set({ status })
    .where(and(
      eq(messages.wa_message_id, data.wa_message_id),
      eq(messages.workspace_id, workspaceId)
    ))

  // Update message job status
  const timestampField = {
    delivered: { delivered_at: new Date() },
    read: { read_at: new Date() },
  }[data.status]

  await db
    .update(messageJobs)
    .set({ status, ...timestampField })
    .where(and(
      eq(messageJobs.wa_message_id, data.wa_message_id),
      eq(messageJobs.workspace_id, workspaceId)
    ))
}
