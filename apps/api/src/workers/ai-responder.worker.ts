/**
 * AI Responder Worker
 * Processes inbound messages and generates GPT-4o replies.
 * Also extracts lead data via function calling.
 */

import { Worker } from 'bullmq'
import OpenAI from 'openai'
import { redis } from '../lib/redis.js'
import { db } from '../db/index.js'
import { eq, and, asc } from 'drizzle-orm'
import {
  workspaces, contacts, conversations, messages,
  aiMemory, leads, brandGuides, messageJobs, appointments,
} from '../db/schema.js'
import { getWhatsAppProvider } from '../providers/whatsapp/index.js'
import { messageSendQueue } from '../lib/queues.js'
import type { AIReplyJob } from '@sendergenie/shared'
import { isOptOutMessage } from '@sendergenie/shared'

const openai = new OpenAI({ apiKey: process.env['OPENAI_API_KEY'] })

const EXTRACT_APPOINTMENT_TOOL: OpenAI.Chat.ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'extract_appointment',
    description: 'Call this when the customer has CONFIRMED a specific date and time for a meeting/demo. Only call when both date AND time are explicitly confirmed.',
    parameters: {
      type: 'object',
      required: ['scheduled_at'],
      properties: {
        scheduled_at: { type: 'string', description: 'ISO 8601 datetime of the appointment, e.g. 2025-04-14T10:00:00' },
        notes: { type: 'string', description: 'Any additional notes about the appointment' },
      },
    },
  },
}

const EXTRACT_LEAD_TOOL: OpenAI.Chat.ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'extract_lead',
    description: 'Call this when you have captured the contact\'s name, phone, or email from conversation',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Contact\'s full name' },
        email: { type: 'string', description: 'Contact\'s email address' },
        interest: { type: 'string', description: 'What the contact is interested in' },
        lead_score: { type: 'number', description: 'Lead quality score 1-10' },
      },
    },
  },
}

export function startAIResponderWorker(): Worker {
  const worker = new Worker<AIReplyJob>(
    'ai-reply',
    async (job) => {
      const { workspace_id, conversation_id, contact_id, incoming_message } = job.data

      // ── 1. Check opt-out keywords ──────────────────────────────────────────
      if (isOptOutMessage(incoming_message)) {
        await db
          .update(contacts)
          .set({ opted_out: true, opted_out_at: new Date() })
          .where(and(eq(contacts.id, contact_id), eq(contacts.workspace_id, workspace_id)))
        console.log(`[AIWorker] Contact ${contact_id} opted out`)
        return
      }

      // ── 2. Load context ────────────────────────────────────────────────────
      const [workspace] = await db
        .select()
        .from(workspaces)
        .where(eq(workspaces.id, workspace_id))
        .limit(1)

      if (!workspace?.ai_enabled) return

      const [contact] = await db
        .select()
        .from(contacts)
        .where(eq(contacts.id, contact_id))
        .limit(1)

      const [conversation] = await db
        .select()
        .from(conversations)
        .where(eq(conversations.id, conversation_id))
        .limit(1)

      if (!conversation?.ai_auto_reply) return

      // ── 3. Load conversation history (last 20 messages) ────────────────────
      const history = await db
        .select()
        .from(messages)
        .where(eq(messages.conversation_id, conversation_id))
        .orderBy(asc(messages.created_at))
        .limit(20)

      // ── 3b. Human takeover check ───────────────────────────────────────────
      // If an agent replied AFTER the last time AI was manually re-enabled,
      // pause AI. We detect "re-enabled" by checking if the last bot message
      // is newer than the last agent message.
      const lastAgentMsg = [...history].reverse().find(m => m.sender_type === 'agent')
      const lastBotMsg   = [...history].reverse().find(m => m.sender_type === 'bot')
      const agentTookOver = lastAgentMsg &&
        (!lastBotMsg || new Date(lastAgentMsg.created_at) > new Date(lastBotMsg.created_at))
      if (agentTookOver) {
        console.log(`[AIWorker] Skipping — agent has taken over conversation ${conversation_id}`)
        return
      }

      // ── 4. Load AI memory for this contact ────────────────────────────────
      const [memory] = await db
        .select()
        .from(aiMemory)
        .where(and(eq(aiMemory.workspace_id, workspace_id), eq(aiMemory.contact_id, contact_id)))
        .limit(1)

      // ── 5. Load active brand guide ─────────────────────────────────────────
      const [brandGuide] = await db
        .select()
        .from(brandGuides)
        .where(and(eq(brandGuides.workspace_id, workspace_id), eq(brandGuides.is_active, true)))
        .limit(1)

      // ── 6. Build GPT messages ──────────────────────────────────────────────
      const knownFacts = memory?.extracted_data
        ? Object.entries(memory.extracted_data)
            .map(([k, v]) => `${k}: ${v}`)
            .join('\n')
        : 'None yet'

      const systemPrompt = `
${workspace.ai_system_prompt ? workspace.ai_system_prompt + '\n' : `אתה נציג שירות ומכירות של ${workspace.name}. ענה תמיד בעברית בסגנון WhatsApp — קצר, חם ואנושי. התנהל בטבעיות: אם הלקוח אומר שלום — ענה שלום. הבן מה הלקוח צריך, ורק אז הצג פתרון רלוונטי. אל תחזור על אותו משפט פעמיים.`}
${brandGuide?.content ?? ''}

CRITICAL RULES:
- Keep replies SHORT — 1-3 sentences max, WhatsApp style
- Be warm, human, NOT robotic
- Your goal: ${brandGuide?.conversion_goal ?? 'help the customer and capture their contact details'}
- When you learn the customer's name or email, call the extract_lead function
- When the customer confirms a SPECIFIC date AND time for a meeting, call extract_appointment AND tell them: "כשתגיע תבקש לדבר עם ${(workspace as Record<string, unknown>)['ai_agent_name'] ?? 'הנציג שלנו'}"

Known facts about this contact:
${knownFacts}
${memory?.extracted_name ? `Contact's name: ${memory.extracted_name}` : ''}
`.trim()

      const chatMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
        { role: 'system', content: systemPrompt },
        ...history.map((m) => ({
          role: m.direction === 'inbound' ? ('user' as const) : ('assistant' as const),
          content: m.body,
        })),
      ]

      // ── 7. Send typing indicator ───────────────────────────────────────────
      if (contact?.phone) {
        const provider = getWhatsAppProvider(workspace)
        await provider.sendTyping?.(contact.phone)
      }

      // ── 8. Call GPT-4o ─────────────────────────────────────────────────────
      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: chatMessages,
        tools: [EXTRACT_LEAD_TOOL, EXTRACT_APPOINTMENT_TOOL],
        tool_choice: 'auto',
        temperature: 0.7,
        max_tokens: 200,
      })

      const choice = response.choices[0]
      if (!choice) return

      // ── 9. Handle lead extraction function call ────────────────────────────
      if (choice.message.tool_calls?.length) {
        for (const toolCall of choice.message.tool_calls) {
          if (toolCall.function.name === 'extract_lead') {
            const extracted = JSON.parse(toolCall.function.arguments) as {
              name?: string
              email?: string
              interest?: string
              lead_score?: number
            }

            // Update AI memory
            await db
              .insert(aiMemory)
              .values({
                workspace_id,
                contact_id,
                extracted_name: extracted.name,
                extracted_email: extracted.email,
                extracted_data: {
                  ...memory?.extracted_data,
                  ...(extracted.interest ? { interest: extracted.interest } : {}),
                },
                lead_score: extracted.lead_score ?? 5,
                lead_captured_at: new Date(),
              })
              .onConflictDoUpdate({
                target: [aiMemory.workspace_id, aiMemory.contact_id],
                set: {
                  extracted_name: extracted.name ?? memory?.extracted_name,
                  extracted_email: extracted.email ?? memory?.extracted_email,
                  lead_score: extracted.lead_score ?? 5,
                  lead_captured_at: new Date(),
                  updated_at: new Date(),
                },
              })

            // Save lead record
            await db.insert(leads).values({
              workspace_id,
              contact_id,
              conversation_id,
              name: extracted.name,
              email: extracted.email,
              phone: contact?.phone,
              raw_data: extracted,
            })

            console.log(`[AIWorker] Lead captured for contact ${contact_id}:`, extracted)
          }

          if (toolCall.function.name === 'extract_appointment') {
            const appt = JSON.parse(toolCall.function.arguments) as {
              scheduled_at: string
              notes?: string
            }

            const agentName = (workspace as Record<string, unknown>)['ai_agent_name'] as string | undefined

            await db.insert(appointments).values({
              workspace_id,
              contact_id,
              conversation_id,
              contact_name: memory?.extracted_name ?? contact?.name,
              contact_phone: contact?.phone,
              scheduled_at: new Date(appt.scheduled_at),
              agent_name: agentName,
              notes: appt.notes,
              status: 'pending',
            }).onConflictDoNothing()

            console.log(`[AIWorker] Appointment booked for contact ${contact_id}:`, appt.scheduled_at)
          }
        }
      }

      const replyText = choice.message.content
      if (!replyText?.trim()) return

      // ── 9. Send reply via WhatsApp ─────────────────────────────────────────
      if (!contact?.phone) return

      await messageSendQueue.add(`ai-reply:${contact_id}`, {
        workspace_id,
        contact_id,
        phone: contact.phone,
        body: replyText,
      })

      // ── 10. Save reply to messages table ───────────────────────────────────
      await db.insert(messages).values({
        workspace_id,
        conversation_id,
        contact_id,
        direction: 'outbound',
        sender_type: 'bot',
        body: replyText,
        status: 'queued',
        ai_generated: true,
      })
    },
    {
      connection: redis,
      concurrency: 10,
    }
  )

  worker.on('failed', (job, err) => {
    console.error(`[AIWorker] Job ${job?.id} failed:`, err.message)
  })

  console.log('[AIWorker] Started')
  return worker
}
