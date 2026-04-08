import type { FastifyInstance } from 'fastify'
import { db } from '../db/index.js'
import { conversations, messages, contacts, users } from '../db/schema.js'
import { eq, and, sql, asc, desc } from 'drizzle-orm'
import { messageSendQueue } from '../lib/queues.js'

export async function conversationRoutes(app: FastifyInstance): Promise<void> {
  // ── GET /conversations ─────────────────────────────────────────────────────
  app.get('/conversations', async (request, reply) => {
    const workspaceId = request.workspaceId
    const query = request.query as { status?: string; assigned_to?: string; limit?: string }

    const limit = Math.min(Number(query.limit ?? 50), 200)

    const rows = await db
      .select({
        conversation: conversations,
        contact: {
          id: contacts.id,
          phone: contacts.phone,
          name: contacts.name,
          tags: contacts.tags,
        },
      })
      .from(conversations)
      .innerJoin(contacts, eq(contacts.id, conversations.contact_id))
      .where(and(
        eq(conversations.workspace_id, workspaceId),
        query.status ? eq(conversations.status, query.status as 'open' | 'resolved' | 'bot') : undefined,
        query.assigned_to ? eq(conversations.assigned_to, query.assigned_to) : undefined,
      ))
      .orderBy(desc(conversations.last_message_at))
      .limit(limit)

    return reply.send({ conversations: rows })
  })

  // ── GET /conversations/:id/messages ───────────────────────────────────────
  app.get('/conversations/:id/messages', async (request, reply) => {
    const { id } = request.params as { id: string }
    const workspaceId = request.workspaceId
    const query = request.query as { before?: string; limit?: string }

    const limit = Math.min(Number(query.limit ?? 50), 100)

    const rows = await db
      .select()
      .from(messages)
      .where(and(
        eq(messages.conversation_id, id),
        eq(messages.workspace_id, workspaceId),
      ))
      .orderBy(asc(messages.created_at))
      .limit(limit)

    return reply.send({ messages: rows })
  })

  // ── POST /conversations/:id/messages ──────────────────────────────────────
  app.post('/conversations/:id/messages', async (request, reply) => {
    const { id } = request.params as { id: string }
    const workspaceId = request.workspaceId
    const userId = request.userId
    const body = request.body as { body: string; is_note?: boolean; media_url?: string }

    if (!body.body?.trim()) {
      return reply.status(400).send({ error: 'Message body is required' })
    }

    const [conversation] = await db
      .select()
      .from(conversations)
      .where(and(eq(conversations.id, id), eq(conversations.workspace_id, workspaceId)))
      .limit(1)

    if (!conversation) return reply.status(404).send({ error: 'Conversation not found' })

    // Save message
    const [message] = await db
      .insert(messages)
      .values({
        workspace_id: workspaceId,
        conversation_id: id,
        contact_id: conversation.contact_id,
        direction: 'outbound',
        sender_type: 'agent',
        body: body.body,
        media_url: body.media_url,
        status: body.is_note ? 'delivered' : 'queued',
        is_note: body.is_note ?? false,
      })
      .returning()

    if (!body.is_note && message) {
      // Get contact phone
      const [contact] = await db
        .select({ phone: contacts.phone })
        .from(contacts)
        .where(eq(contacts.id, conversation.contact_id))
        .limit(1)

      if (contact) {
        await messageSendQueue.add(`agent:${id}`, {
          workspace_id: workspaceId,
          contact_id: conversation.contact_id,
          phone: contact.phone,
          body: body.body,
          media_url: body.media_url,
        })
      }
    }

    // Update conversation
    await db
      .update(conversations)
      .set({
        last_message_at: new Date(),
        last_message_preview: body.is_note ? conversation.last_message_preview : body.body.slice(0, 100),
        updated_at: new Date(),
      })
      .where(eq(conversations.id, id))

    return reply.status(201).send({ message })
  })

  // ── POST /conversations/:id/assign ────────────────────────────────────────
  app.post('/conversations/:id/assign', async (request, reply) => {
    const { id } = request.params as { id: string }
    const workspaceId = request.workspaceId
    const body = request.body as { user_id: string | null }

    await db
      .update(conversations)
      .set({ assigned_to: body.user_id ?? undefined, updated_at: new Date() })
      .where(and(eq(conversations.id, id), eq(conversations.workspace_id, workspaceId)))

    return reply.send({ ok: true })
  })

  // ── POST /conversations/:id/resolve ───────────────────────────────────────
  app.post('/conversations/:id/resolve', async (request, reply) => {
    const { id } = request.params as { id: string }
    const workspaceId = request.workspaceId

    await db
      .update(conversations)
      .set({ status: 'resolved', unread_count: 0, updated_at: new Date() })
      .where(and(eq(conversations.id, id), eq(conversations.workspace_id, workspaceId)))

    return reply.send({ ok: true })
  })

  // ── POST /conversations/:id/ai-toggle ─────────────────────────────────────
  app.post('/conversations/:id/ai-toggle', async (request, reply) => {
    const { id } = request.params as { id: string }
    const workspaceId = request.workspaceId
    const body = request.body as { enabled: boolean }

    await db
      .update(conversations)
      .set({ ai_auto_reply: body.enabled, updated_at: new Date() })
      .where(and(eq(conversations.id, id), eq(conversations.workspace_id, workspaceId)))

    return reply.send({ ok: true })
  })

  // ── PATCH /conversations/:id/read ─────────────────────────────────────────
  app.patch('/conversations/:id/read', async (request, reply) => {
    const { id } = request.params as { id: string }
    const workspaceId = request.workspaceId

    await db
      .update(conversations)
      .set({ unread_count: 0, updated_at: new Date() })
      .where(and(eq(conversations.id, id), eq(conversations.workspace_id, workspaceId)))

    return reply.send({ ok: true })
  })
}
