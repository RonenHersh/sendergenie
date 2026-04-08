import { Queue } from 'bullmq'
import { redis } from './redis.js'
import type { SendMessageJob, AIReplyJob, WebhookPushJob } from '@sendergenie/shared'

const defaultJobOptions = {
  attempts: 3,
  backoff: {
    type: 'exponential' as const,
    delay: 30_000, // 30 seconds initial, then doubles
  },
  removeOnComplete: { count: 1000, age: 24 * 60 * 60 },
  removeOnFail: { count: 5000, age: 7 * 24 * 60 * 60 },
}

// ─── Message Send Queue ───────────────────────────────────────────────────────

export const messageSendQueue = new Queue<SendMessageJob>('message-send', {
  connection: redis,
  defaultJobOptions,
})

// ─── AI Reply Queue ───────────────────────────────────────────────────────────

export const aiReplyQueue = new Queue<AIReplyJob>('ai-reply', {
  connection: redis,
  defaultJobOptions: {
    ...defaultJobOptions,
    attempts: 2,
  },
})

// ─── Webhook Push Queue ───────────────────────────────────────────────────────

export const webhookPushQueue = new Queue<WebhookPushJob>('webhook-push', {
  connection: redis,
  defaultJobOptions: {
    ...defaultJobOptions,
    attempts: 5,
    backoff: {
      type: 'exponential',
      delay: 10_000,
    },
  },
})

// ─── Helper: queue a campaign message with anti-ban delay ─────────────────────

export async function enqueueCampaignMessage(
  job: SendMessageJob,
  delayMs: number
): Promise<void> {
  await messageSendQueue.add(`send:${job.contact_id}`, job, {
    delay: delayMs,
    jobId: `${job.campaign_id}:${job.contact_id}:${job.message_job_id}`,
  })
}
