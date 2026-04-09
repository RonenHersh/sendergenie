import {
  pgTable, uuid, text, boolean, integer, timestamp,
  jsonb, uniqueIndex, index, pgEnum
} from 'drizzle-orm/pg-core'

// ─── Enums ────────────────────────────────────────────────────────────────────

export const planEnum = pgEnum('plan', ['free', 'starter', 'pro', 'business', 'enterprise'])
export const providerEnum = pgEnum('whatsapp_provider', ['waapi', 'meta'])
export const userRoleEnum = pgEnum('user_role', ['owner', 'admin', 'agent'])
export const campaignStatusEnum = pgEnum('campaign_status', ['draft', 'scheduled', 'running', 'paused', 'done', 'failed'])
export const messageDirectionEnum = pgEnum('message_direction', ['inbound', 'outbound'])
export const messageStatusEnum = pgEnum('message_status', ['queued', 'sent', 'delivered', 'read', 'failed'])
export const senderTypeEnum = pgEnum('sender_type', ['contact', 'agent', 'bot', 'campaign'])
export const conversationStatusEnum = pgEnum('conversation_status', ['open', 'resolved', 'bot'])
export const contentTypeEnum = pgEnum('content_type', ['text', 'image', 'audio', 'video', 'document'])

// ─── Workspaces ───────────────────────────────────────────────────────────────

export const workspaces = pgTable('workspaces', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  plan: planEnum('plan').default('free').notNull(),
  stripe_customer_id: text('stripe_customer_id'),
  stripe_subscription_id: text('stripe_subscription_id'),
  whatsapp_provider: providerEnum('whatsapp_provider').default('waapi').notNull(),
  whatsapp_config: jsonb('whatsapp_config').default({}).$type<Record<string, string>>(),
  ai_enabled: boolean('ai_enabled').default(false).notNull(),
  ai_system_prompt: text('ai_system_prompt'),
  monthly_message_limit: integer('monthly_message_limit').default(100).notNull(),
  messages_sent_this_month: integer('messages_sent_this_month').default(0).notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

// ─── Users ────────────────────────────────────────────────────────────────────

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspace_id: uuid('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  supabase_auth_id: text('supabase_auth_id').unique(), // link to Supabase Auth
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  role: userRoleEnum('role').default('agent').notNull(),
  avatar_url: text('avatar_url'),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index('users_workspace_idx').on(t.workspace_id),
])

// ─── Contacts ─────────────────────────────────────────────────────────────────

export const contacts = pgTable('contacts', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspace_id: uuid('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  phone: text('phone').notNull(), // E.164: +972501234567
  name: text('name'),
  email: text('email'),
  tags: text('tags').array().default([]).notNull(),
  opted_out: boolean('opted_out').default(false).notNull(),
  opted_out_at: timestamp('opted_out_at', { withTimezone: true }),
  custom_fields: jsonb('custom_fields').default({}).$type<Record<string, string>>(),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  uniqueIndex('contacts_workspace_phone_idx').on(t.workspace_id, t.phone),
  index('contacts_workspace_idx').on(t.workspace_id),
  index('contacts_tags_idx').on(t.tags),
])

// ─── Blacklist ────────────────────────────────────────────────────────────────

export const blacklist = pgTable('blacklist', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspace_id: uuid('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  phone: text('phone').notNull(),
  reason: text('reason'),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  uniqueIndex('blacklist_workspace_phone_idx').on(t.workspace_id, t.phone),
])

// ─── Campaigns ────────────────────────────────────────────────────────────────

export const campaigns = pgTable('campaigns', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspace_id: uuid('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  status: campaignStatusEnum('status').default('draft').notNull(),
  target_filter: jsonb('target_filter').default({}).$type<{
    tags?: string[]
    exclude_tags?: string[]
    exclude_replied?: boolean
  }>(),
  scheduled_at: timestamp('scheduled_at', { withTimezone: true }),
  started_at: timestamp('started_at', { withTimezone: true }),
  completed_at: timestamp('completed_at', { withTimezone: true }),
  total_recipients: integer('total_recipients').default(0).notNull(),
  sent: integer('sent').default(0).notNull(),
  delivered: integer('delivered').default(0).notNull(),
  read: integer('read').default(0).notNull(),
  replied: integer('replied').default(0).notNull(),
  failed: integer('failed').default(0).notNull(),
  daily_limit: integer('daily_limit').default(200).notNull(),
  delay_min_seconds: integer('delay_min_seconds').default(20).notNull(),
  delay_max_seconds: integer('delay_max_seconds').default(60).notNull(),
  created_by: uuid('created_by').references(() => users.id),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index('campaigns_workspace_idx').on(t.workspace_id),
  index('campaigns_status_idx').on(t.status),
])

// ─── Campaign Messages (steps) ────────────────────────────────────────────────

export const campaignMessages = pgTable('campaign_messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  campaign_id: uuid('campaign_id').notNull().references(() => campaigns.id, { onDelete: 'cascade' }),
  workspace_id: uuid('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  step_order: integer('step_order').default(0).notNull(),
  body: text('body').notNull(),
  media_url: text('media_url'),
  delay_after_prev_minutes: integer('delay_after_prev_minutes').default(0).notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index('campaign_messages_campaign_idx').on(t.campaign_id),
])

// ─── Message Jobs ─────────────────────────────────────────────────────────────

export const messageJobs = pgTable('message_jobs', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspace_id: uuid('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  campaign_id: uuid('campaign_id').references(() => campaigns.id, { onDelete: 'cascade' }),
  campaign_message_id: uuid('campaign_message_id').references(() => campaignMessages.id),
  contact_id: uuid('contact_id').notNull().references(() => contacts.id, { onDelete: 'cascade' }),
  status: messageStatusEnum('status').default('queued').notNull(),
  error_message: text('error_message'),
  scheduled_at: timestamp('scheduled_at', { withTimezone: true }),
  sent_at: timestamp('sent_at', { withTimezone: true }),
  delivered_at: timestamp('delivered_at', { withTimezone: true }),
  read_at: timestamp('read_at', { withTimezone: true }),
  wa_message_id: text('wa_message_id').unique(),
  retry_count: integer('retry_count').default(0).notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index('message_jobs_workspace_idx').on(t.workspace_id),
  index('message_jobs_campaign_idx').on(t.campaign_id),
  index('message_jobs_status_idx').on(t.status),
  index('message_jobs_wa_id_idx').on(t.wa_message_id),
])

// ─── Conversations ────────────────────────────────────────────────────────────

export const conversations = pgTable('conversations', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspace_id: uuid('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  contact_id: uuid('contact_id').notNull().references(() => contacts.id, { onDelete: 'cascade' }),
  assigned_to: uuid('assigned_to').references(() => users.id),
  status: conversationStatusEnum('status').default('open').notNull(),
  last_message_at: timestamp('last_message_at', { withTimezone: true }),
  last_message_preview: text('last_message_preview'),
  unread_count: integer('unread_count').default(0).notNull(),
  ai_auto_reply: boolean('ai_auto_reply').default(false).notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  uniqueIndex('conversations_workspace_contact_idx').on(t.workspace_id, t.contact_id),
  index('conversations_workspace_idx').on(t.workspace_id),
  index('conversations_status_idx').on(t.status),
  index('conversations_last_message_idx').on(t.last_message_at),
])

// ─── Messages ─────────────────────────────────────────────────────────────────

export const messages = pgTable('messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspace_id: uuid('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  conversation_id: uuid('conversation_id').notNull().references(() => conversations.id, { onDelete: 'cascade' }),
  contact_id: uuid('contact_id').notNull().references(() => contacts.id, { onDelete: 'cascade' }),
  direction: messageDirectionEnum('direction').notNull(),
  sender_type: senderTypeEnum('sender_type').notNull(),
  body: text('body').notNull(),
  media_url: text('media_url'),
  media_type: contentTypeEnum('media_type'),
  wa_message_id: text('wa_message_id').unique(),
  status: messageStatusEnum('status').default('sent').notNull(),
  is_note: boolean('is_note').default(false).notNull(),
  ai_generated: boolean('ai_generated').default(false).notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index('messages_conversation_idx').on(t.conversation_id),
  index('messages_workspace_idx').on(t.workspace_id),
  index('messages_wa_id_idx').on(t.wa_message_id),
  index('messages_created_at_idx').on(t.created_at),
])

// ─── AI Memory ────────────────────────────────────────────────────────────────

export const aiMemory = pgTable('ai_memory', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspace_id: uuid('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  contact_id: uuid('contact_id').notNull().references(() => contacts.id, { onDelete: 'cascade' }),
  extracted_name: text('extracted_name'),
  extracted_email: text('extracted_email'),
  extracted_data: jsonb('extracted_data').default({}).$type<Record<string, unknown>>(),
  conversation_summary: text('conversation_summary'),
  lead_score: integer('lead_score').default(0).notNull(),
  lead_captured_at: timestamp('lead_captured_at', { withTimezone: true }),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  uniqueIndex('ai_memory_workspace_contact_idx').on(t.workspace_id, t.contact_id),
])

// ─── Leads ────────────────────────────────────────────────────────────────────

export const leads = pgTable('leads', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspace_id: uuid('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  contact_id: uuid('contact_id').notNull().references(() => contacts.id, { onDelete: 'cascade' }),
  conversation_id: uuid('conversation_id').references(() => conversations.id),
  name: text('name'),
  phone: text('phone'),
  email: text('email'),
  raw_data: jsonb('raw_data').default({}).$type<Record<string, unknown>>(),
  pushed_to: text('pushed_to'),
  pushed_at: timestamp('pushed_at', { withTimezone: true }),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index('leads_workspace_idx').on(t.workspace_id),
])

// ─── Appointments ─────────────────────────────────────────────────────────────

export const appointments = pgTable('appointments', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspace_id: uuid('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  contact_id: uuid('contact_id').notNull().references(() => contacts.id, { onDelete: 'cascade' }),
  conversation_id: uuid('conversation_id').references(() => conversations.id, { onDelete: 'set null' }),
  contact_name: text('contact_name'),
  contact_phone: text('contact_phone'),
  scheduled_at: timestamp('scheduled_at', { withTimezone: true }).notNull(),
  agent_name: text('agent_name'),
  notes: text('notes'),
  status: text('status').default('pending').notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index('appointments_workspace_idx').on(t.workspace_id),
  index('appointments_scheduled_idx').on(t.scheduled_at),
])

// ─── Webhook Configs ──────────────────────────────────────────────────────────

export const webhookConfigs = pgTable('webhook_configs', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspace_id: uuid('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  url: text('url').notNull(),
  events: text('events').array().default([]).notNull(),
  secret: text('secret'),
  active: boolean('active').default(true).notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

// ─── Brand Guides (AI Knowledge Base) ────────────────────────────────────────

export const brandGuides = pgTable('brand_guides', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspace_id: uuid('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  content: text('content').notNull(),
  conversion_goal: text('conversion_goal'),
  is_active: boolean('is_active').default(true).notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

// ─── Audit Log ────────────────────────────────────────────────────────────────

export const auditLog = pgTable('audit_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspace_id: uuid('workspace_id').notNull(),
  user_id: uuid('user_id'),
  action: text('action').notNull(),
  resource_type: text('resource_type'),
  resource_id: uuid('resource_id'),
  metadata: jsonb('metadata').default({}).$type<Record<string, unknown>>(),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index('audit_log_workspace_idx').on(t.workspace_id),
  index('audit_log_created_at_idx').on(t.created_at),
])

// ─── Types (inferred from schema) ─────────────────────────────────────────────

export type Workspace = typeof workspaces.$inferSelect
export type NewWorkspace = typeof workspaces.$inferInsert
export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
export type Contact = typeof contacts.$inferSelect
export type NewContact = typeof contacts.$inferInsert
export type Campaign = typeof campaigns.$inferSelect
export type NewCampaign = typeof campaigns.$inferInsert
export type CampaignMessage = typeof campaignMessages.$inferSelect
export type Message = typeof messages.$inferSelect
export type NewMessage = typeof messages.$inferInsert
export type Conversation = typeof conversations.$inferSelect
export type MessageJob = typeof messageJobs.$inferSelect
