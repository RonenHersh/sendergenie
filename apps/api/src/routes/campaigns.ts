import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { db } from '../db/index.js'
import { campaigns, campaignMessages, contacts, messageJobs } from '../db/schema.js'
import { eq, and, sql, inArray } from 'drizzle-orm'
import { enqueueCampaignMessage } from '../lib/queues.js'
import { interpolateTemplate } from '@sendergenie/shared'
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env['OPENAI_API_KEY'] })

const CreateCampaignSchema = z.object({
  name: z.string().min(1),
  target_filter: z.object({
    tags: z.array(z.string()).optional(),
    exclude_tags: z.array(z.string()).optional(),
    exclude_replied: z.boolean().optional(),
  }).default({}),
  messages: z.array(z.object({
    body: z.string().min(1),
    media_url: z.string().url().optional(),
    delay_after_prev_minutes: z.number().min(0).default(0),
    step_order: z.number().default(0),
  })).min(1),
  daily_limit: z.number().min(1).max(1000).default(200),
  delay_min_seconds: z.number().min(5).default(20),
  delay_max_seconds: z.number().min(10).default(60),
  scheduled_at: z.string().datetime().optional(),
})

const AIGenerateSchema = z.object({
  idea: z.string().min(10),
  tone: z.enum(['sales', 'friendly', 'aggressive', 'follow_up']),
  variables: z.array(z.string()).default(['name']),
  language: z.enum(['he', 'en', 'auto']).default('auto'),
})

export async function campaignRoutes(app: FastifyInstance): Promise<void> {
  // ── GET /campaigns ─────────────────────────────────────────────────────────
  app.get('/campaigns', async (request, reply) => {
    const workspaceId = request.workspaceId

    const rows = await db
      .select()
      .from(campaigns)
      .where(eq(campaigns.workspace_id, workspaceId))
      .orderBy(sql`created_at DESC`)

    return reply.send({ campaigns: rows })
  })

  // ── POST /campaigns ────────────────────────────────────────────────────────
  app.post('/campaigns', async (request, reply) => {
    const workspaceId = request.workspaceId
    const userId = request.userId
    const body = CreateCampaignSchema.parse(request.body)

    const [campaign] = await db
      .insert(campaigns)
      .values({
        workspace_id: workspaceId,
        name: body.name,
        status: body.scheduled_at ? 'scheduled' : 'draft',
        target_filter: body.target_filter,
        daily_limit: body.daily_limit,
        delay_min_seconds: body.delay_min_seconds,
        delay_max_seconds: body.delay_max_seconds,
        scheduled_at: body.scheduled_at ? new Date(body.scheduled_at) : undefined,
        created_by: userId,
      })
      .returning()

    if (!campaign) return reply.status(500).send({ error: 'Failed to create campaign' })

    // Insert message steps
    await db.insert(campaignMessages).values(
      body.messages.map((m, i) => ({
        campaign_id: campaign.id,
        workspace_id: workspaceId,
        step_order: m.step_order || i,
        body: m.body,
        media_url: m.media_url,
        delay_after_prev_minutes: m.delay_after_prev_minutes,
      }))
    )

    return reply.status(201).send({ campaign })
  })

  // ── POST /campaigns/:id/launch ─────────────────────────────────────────────
  app.post('/campaigns/:id/launch', async (request, reply) => {
    const { id } = request.params as { id: string }
    const workspaceId = request.workspaceId

    const [campaign] = await db
      .select()
      .from(campaigns)
      .where(and(eq(campaigns.id, id), eq(campaigns.workspace_id, workspaceId)))
      .limit(1)

    if (!campaign) return reply.status(404).send({ error: 'Campaign not found' })
    if (!['draft', 'scheduled'].includes(campaign.status)) {
      return reply.status(400).send({ error: 'Campaign already launched' })
    }

    // Get campaign messages (steps)
    const steps = await db
      .select()
      .from(campaignMessages)
      .where(eq(campaignMessages.campaign_id, id))
      .orderBy(campaignMessages.step_order)

    if (!steps.length) {
      return reply.status(400).send({ error: 'Campaign has no messages' })
    }

    // Get eligible recipients
    const filter = campaign.target_filter ?? {}
    let contactQuery = db
      .select()
      .from(contacts)
      .where(and(
        eq(contacts.workspace_id, workspaceId),
        eq(contacts.opted_out, false),
      ))

    const recipients = await contactQuery

    // Filter by tags if specified
    const filteredRecipients = recipients.filter(c => {
      if (filter.tags?.length) {
        const hasTags = filter.tags.some(tag => c.tags.includes(tag))
        if (!hasTags) return false
      }
      if (filter.exclude_tags?.length) {
        const hasExcluded = filter.exclude_tags.some(tag => c.tags.includes(tag))
        if (hasExcluded) return false
      }
      return true
    })

    if (!filteredRecipients.length) {
      return reply.status(400).send({ error: 'No eligible recipients found' })
    }

    // Update campaign status
    await db
      .update(campaigns)
      .set({
        status: 'running',
        started_at: new Date(),
        total_recipients: filteredRecipients.length,
      })
      .where(eq(campaigns.id, id))

    // Queue messages with delays
    const firstStep = steps[0]!
    let cumulativeDelayMs = 0
    let jobsQueued = 0

    for (const contact of filteredRecipients) {
      // Anti-ban: random delay between sends
      const randomDelay =
        (campaign.delay_min_seconds +
          Math.random() * (campaign.delay_max_seconds - campaign.delay_min_seconds)) *
        1000

      cumulativeDelayMs += randomDelay

      // Create message job record
      const [job] = await db
        .insert(messageJobs)
        .values({
          workspace_id: workspaceId,
          campaign_id: id,
          campaign_message_id: firstStep.id,
          contact_id: contact.id,
          status: 'queued',
          scheduled_at: new Date(Date.now() + cumulativeDelayMs),
        })
        .returning()

      if (!job) continue

      const personalizedBody = interpolateTemplate(firstStep.body, {
        name: contact.name ?? undefined,
        phone: contact.phone,
        ...contact.custom_fields,
      })

      await enqueueCampaignMessage(
        {
          workspace_id: workspaceId,
          contact_id: contact.id,
          phone: contact.phone,
          body: personalizedBody,
          media_url: firstStep.media_url ?? undefined,
          campaign_id: id,
          message_job_id: job.id,
        },
        cumulativeDelayMs
      )

      jobsQueued++

      // Reset delay at daily limit (continue tomorrow)
      if (jobsQueued % campaign.daily_limit === 0) {
        cumulativeDelayMs = 24 * 60 * 60 * 1000 // next day
      }
    }

    return reply.send({
      ok: true,
      total_recipients: filteredRecipients.length,
      jobs_queued: jobsQueued,
    })
  })

  // ── POST /campaigns/:id/pause ──────────────────────────────────────────────
  app.post('/campaigns/:id/pause', async (request, reply) => {
    const { id } = request.params as { id: string }
    const workspaceId = request.workspaceId

    await db
      .update(campaigns)
      .set({ status: 'paused' })
      .where(and(eq(campaigns.id, id), eq(campaigns.workspace_id, workspaceId)))

    return reply.send({ ok: true })
  })

  // ── GET /campaigns/:id/stats ───────────────────────────────────────────────
  app.get('/campaigns/:id/stats', async (request, reply) => {
    const { id } = request.params as { id: string }
    const workspaceId = request.workspaceId

    const [campaign] = await db
      .select()
      .from(campaigns)
      .where(and(eq(campaigns.id, id), eq(campaigns.workspace_id, workspaceId)))
      .limit(1)

    if (!campaign) return reply.status(404).send({ error: 'Not found' })

    return reply.send({ stats: campaign })
  })

  // ── POST /campaigns/ai-generate ───────────────────────────────────────────
  app.post('/campaigns/ai-generate', async (request, reply) => {
    const workspaceId = request.workspaceId
    const body = AIGenerateSchema.parse(request.body)

    const toneGuide = {
      sales: 'Professional, value-focused, clear CTA',
      friendly: 'Warm, casual, like a friend recommending something',
      aggressive: 'Urgent, FOMO, limited time offer',
      follow_up: 'Gentle, non-pushy, checking in after no response',
    }[body.tone]

    const langGuide = body.language === 'he'
      ? 'Write ONLY in Hebrew (עברית). Use Israeli casual style.'
      : body.language === 'en'
      ? 'Write ONLY in English. Be conversational.'
      : 'Detect the appropriate language from the idea and write in it.'

    const prompt = `
You are a WhatsApp marketing expert. Generate a 3-message campaign sequence.

Campaign idea: "${body.idea}"
Tone: ${toneGuide}
Language: ${langGuide}
Available variables: ${body.variables.map(v => `{{${v}}}`).join(', ')}

Rules:
- Each message: 1-4 sentences MAX (WhatsApp style, not email)
- Use emojis naturally (2-3 per message max)
- Message 2 sends only if no reply to message 1 (after 24h)
- Message 3 sends only if no reply to message 2 (after 48h more)
- Make it feel like a real person wrote it, not a marketing bot
- Use variables naturally where they fit

Respond with ONLY valid JSON, no explanation:
{
  "campaign_name": "...",
  "messages": [
    {"step": 0, "delay_after_prev_minutes": 0, "body": "..."},
    {"step": 1, "delay_after_prev_minutes": 1440, "body": "..."},
    {"step": 2, "delay_after_prev_minutes": 2880, "body": "..."}
  ]
}
`

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.8,
      max_tokens: 600,
    })

    const result = JSON.parse(response.choices[0]?.message.content ?? '{}') as {
      campaign_name: string
      messages: Array<{ step: number; delay_after_prev_minutes: number; body: string }>
    }

    return reply.send({ generated: result })
  })
}
