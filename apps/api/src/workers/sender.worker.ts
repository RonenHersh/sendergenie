/**
 * Sender Worker — processes the message:send queue
 *
 * Anti-ban strategy:
 * - Random delay between messages (configured per campaign)
 * - Daily limit per workspace
 * - Skip opted-out / blacklisted contacts
 * - Exponential backoff on rate-limit errors
 */

import { Worker } from 'bullmq'
import { redis } from '../lib/redis.js'
import { db } from '../db/index.js'
import { eq, and } from 'drizzle-orm'
import { workspaces, contacts, blacklist, messageJobs, messages } from '../db/schema.js'
import { getWhatsAppProvider } from '../providers/whatsapp/index.js'
import { interpolateTemplate } from '@sendergenie/shared'
import type { SendMessageJob } from '@sendergenie/shared'

function getTodayKey(workspaceId: string): string {
  const today = new Date().toISOString().slice(0, 10)
  return `daily_sent:${workspaceId}:${today}`
}

export function startSenderWorker(): Worker {
  const worker = new Worker<SendMessageJob>(
    'message-send',
    async (job) => {
      const { workspace_id, contact_id, phone, body, media_url, campaign_id, message_job_id, message_id } =
        job.data

      // ── 1. Load workspace ──────────────────────────────────────────────────
      const [workspace] = await db
        .select()
        .from(workspaces)
        .where(eq(workspaces.id, workspace_id))
        .limit(1)

      if (!workspace) {
        throw new Error(`Workspace ${workspace_id} not found`)
      }

      // ── 2. Daily limit check ───────────────────────────────────────────────
      const todayKey = getTodayKey(workspace_id)
      const sentToday = Number(await redis.get(todayKey) ?? 0)

      if (sentToday >= workspace.monthly_message_limit) {
        // Re-queue for tomorrow at 9am
        const tomorrow = new Date()
        tomorrow.setDate(tomorrow.getDate() + 1)
        tomorrow.setHours(9, 0, 0, 0)
        const delayMs = tomorrow.getTime() - Date.now()

        await job.moveToDelayed(Date.now() + delayMs)
        return
      }

      // ── 3. Check opt-out ───────────────────────────────────────────────────
      const [contact] = await db
        .select({ opted_out: contacts.opted_out })
        .from(contacts)
        .where(and(eq(contacts.id, contact_id), eq(contacts.workspace_id, workspace_id)))
        .limit(1)

      if (contact?.opted_out) {
        if (message_job_id) {
          await db
            .update(messageJobs)
            .set({ status: 'failed', error_message: 'Contact opted out' })
            .where(eq(messageJobs.id, message_job_id))
        }
        return
      }

      // ── 4. Check blacklist ─────────────────────────────────────────────────
      const [blacklisted] = await db
        .select({ id: blacklist.id })
        .from(blacklist)
        .where(and(eq(blacklist.workspace_id, workspace_id), eq(blacklist.phone, phone)))
        .limit(1)

      if (blacklisted) {
        if (message_job_id) {
          await db
            .update(messageJobs)
            .set({ status: 'failed', error_message: 'Contact is blacklisted' })
            .where(eq(messageJobs.id, message_job_id))
        }
        return
      }

      // ── 5. Get provider and send ───────────────────────────────────────────
      const provider = getWhatsAppProvider(workspace)

      let result
      if (media_url) {
        result = await provider.sendImage(phone, media_url, body)
      } else {
        result = await provider.sendText(phone, body)
      }

      // ── 6. Update status ───────────────────────────────────────────────────
      if (result.status === 'sent') {
        if (message_job_id) {
          await db
            .update(messageJobs)
            .set({
              status: 'sent',
              wa_message_id: result.wa_message_id,
              sent_at: new Date(),
            })
            .where(eq(messageJobs.id, message_job_id))
        }

        if (message_id) {
          await db
            .update(messages)
            .set({ status: 'sent', wa_message_id: result.wa_message_id })
            .where(eq(messages.id, message_id))
        }

        // Increment daily counter (expires at midnight)
        await redis.incr(todayKey)
        await redis.expireat(todayKey, Math.floor(new Date().setHours(23, 59, 59, 999) / 1000))

        // Increment workspace monthly counter
        await db
          .update(workspaces)
          .set({
            messages_sent_this_month: workspace.messages_sent_this_month + 1,
          })
          .where(eq(workspaces.id, workspace_id))

      } else {
        if (message_job_id) {
          await db
            .update(messageJobs)
            .set({
              status: 'failed',
              error_message: result.error,
              retry_count: job.attemptsMade,
            })
            .where(eq(messageJobs.id, message_job_id))
        }
        throw new Error(result.error ?? 'Send failed') // triggers BullMQ retry
      }
    },
    {
      connection: redis,
      concurrency: 5, // max 5 simultaneous sends per worker instance
      limiter: {
        max: 10,       // max 10 jobs per...
        duration: 1000, // ...per second (global rate limit)
      },
    }
  )

  worker.on('failed', (job, err) => {
    console.error(`[SenderWorker] Job ${job?.id} failed:`, err.message)
  })

  worker.on('completed', (job) => {
    console.log(`[SenderWorker] Job ${job.id} completed`)
  })

  console.log('[SenderWorker] Started')
  return worker
}
