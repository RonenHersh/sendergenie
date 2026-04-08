/**
 * Run this once to create all tables in Supabase.
 * Usage: npx tsx src/db/migrate.ts
 */

import 'dotenv/config'
import postgres from 'postgres'

const sql = postgres(process.env['DATABASE_URL']!)

async function migrate() {
  console.log('🚀 Running migrations...\n')

  // PostgreSQL doesn't support CREATE TYPE IF NOT EXISTS — use DO block instead
  await sql`
    DO $$ BEGIN
      CREATE TYPE "public"."campaign_status" AS ENUM('draft', 'scheduled', 'running', 'paused', 'done', 'failed');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$
  `
  await sql`
    DO $$ BEGIN
      CREATE TYPE "public"."content_type" AS ENUM('text', 'image', 'audio', 'video', 'document');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$
  `
  await sql`
    DO $$ BEGIN
      CREATE TYPE "public"."conversation_status" AS ENUM('open', 'resolved', 'bot');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$
  `
  await sql`
    DO $$ BEGIN
      CREATE TYPE "public"."message_direction" AS ENUM('inbound', 'outbound');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$
  `
  await sql`
    DO $$ BEGIN
      CREATE TYPE "public"."message_status" AS ENUM('queued', 'sent', 'delivered', 'read', 'failed');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$
  `
  await sql`
    DO $$ BEGIN
      CREATE TYPE "public"."plan" AS ENUM('free', 'starter', 'pro', 'business', 'enterprise');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$
  `
  await sql`
    DO $$ BEGIN
      CREATE TYPE "public"."whatsapp_provider" AS ENUM('waapi', 'meta');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$
  `
  await sql`
    DO $$ BEGIN
      CREATE TYPE "public"."sender_type" AS ENUM('contact', 'agent', 'bot', 'campaign');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$
  `
  await sql`
    DO $$ BEGIN
      CREATE TYPE "public"."user_role" AS ENUM('owner', 'admin', 'agent');
    EXCEPTION WHEN duplicate_object THEN NULL; END $$
  `

  console.log('✓ Enums created')

  await sql`
    CREATE TABLE IF NOT EXISTS "workspaces" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "name" text NOT NULL,
      "slug" text NOT NULL UNIQUE,
      "plan" "plan" DEFAULT 'free' NOT NULL,
      "stripe_customer_id" text,
      "stripe_subscription_id" text,
      "whatsapp_provider" "whatsapp_provider" DEFAULT 'waapi' NOT NULL,
      "whatsapp_config" jsonb DEFAULT '{}'::jsonb,
      "ai_enabled" boolean DEFAULT false NOT NULL,
      "ai_system_prompt" text,
      "monthly_message_limit" integer DEFAULT 100 NOT NULL,
      "messages_sent_this_month" integer DEFAULT 0 NOT NULL,
      "created_at" timestamp with time zone DEFAULT now() NOT NULL,
      "updated_at" timestamp with time zone DEFAULT now() NOT NULL
    )
  `

  await sql`
    CREATE TABLE IF NOT EXISTS "users" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "workspace_id" uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      "supabase_auth_id" text UNIQUE,
      "email" text NOT NULL UNIQUE,
      "name" text NOT NULL,
      "role" "user_role" DEFAULT 'agent' NOT NULL,
      "avatar_url" text,
      "created_at" timestamp with time zone DEFAULT now() NOT NULL
    )
  `

  await sql`CREATE INDEX IF NOT EXISTS "users_workspace_idx" ON "users"("workspace_id")`

  await sql`
    CREATE TABLE IF NOT EXISTS "contacts" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "workspace_id" uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      "phone" text NOT NULL,
      "name" text,
      "email" text,
      "tags" text[] DEFAULT '{}' NOT NULL,
      "opted_out" boolean DEFAULT false NOT NULL,
      "opted_out_at" timestamp with time zone,
      "custom_fields" jsonb DEFAULT '{}'::jsonb,
      "created_at" timestamp with time zone DEFAULT now() NOT NULL,
      "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
      UNIQUE("workspace_id", "phone")
    )
  `

  await sql`CREATE INDEX IF NOT EXISTS "contacts_workspace_idx" ON "contacts"("workspace_id")`
  await sql`CREATE INDEX IF NOT EXISTS "contacts_tags_idx" ON "contacts"("tags")`

  await sql`
    CREATE TABLE IF NOT EXISTS "blacklist" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "workspace_id" uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      "phone" text NOT NULL,
      "reason" text,
      "created_at" timestamp with time zone DEFAULT now() NOT NULL,
      UNIQUE("workspace_id", "phone")
    )
  `

  await sql`
    CREATE TABLE IF NOT EXISTS "campaigns" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "workspace_id" uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      "name" text NOT NULL,
      "status" "campaign_status" DEFAULT 'draft' NOT NULL,
      "target_filter" jsonb DEFAULT '{}'::jsonb,
      "scheduled_at" timestamp with time zone,
      "started_at" timestamp with time zone,
      "completed_at" timestamp with time zone,
      "total_recipients" integer DEFAULT 0 NOT NULL,
      "sent" integer DEFAULT 0 NOT NULL,
      "delivered" integer DEFAULT 0 NOT NULL,
      "read" integer DEFAULT 0 NOT NULL,
      "replied" integer DEFAULT 0 NOT NULL,
      "failed" integer DEFAULT 0 NOT NULL,
      "daily_limit" integer DEFAULT 200 NOT NULL,
      "delay_min_seconds" integer DEFAULT 20 NOT NULL,
      "delay_max_seconds" integer DEFAULT 60 NOT NULL,
      "created_by" uuid REFERENCES users(id),
      "created_at" timestamp with time zone DEFAULT now() NOT NULL
    )
  `

  await sql`CREATE INDEX IF NOT EXISTS "campaigns_workspace_idx" ON "campaigns"("workspace_id")`
  await sql`CREATE INDEX IF NOT EXISTS "campaigns_status_idx" ON "campaigns"("status")`

  await sql`
    CREATE TABLE IF NOT EXISTS "campaign_messages" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "campaign_id" uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
      "workspace_id" uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      "step_order" integer DEFAULT 0 NOT NULL,
      "body" text NOT NULL,
      "media_url" text,
      "delay_after_prev_minutes" integer DEFAULT 0 NOT NULL,
      "created_at" timestamp with time zone DEFAULT now() NOT NULL
    )
  `

  await sql`CREATE INDEX IF NOT EXISTS "campaign_messages_campaign_idx" ON "campaign_messages"("campaign_id")`

  await sql`
    CREATE TABLE IF NOT EXISTS "conversations" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "workspace_id" uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      "contact_id" uuid NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
      "assigned_to" uuid REFERENCES users(id),
      "status" "conversation_status" DEFAULT 'open' NOT NULL,
      "last_message_at" timestamp with time zone,
      "last_message_preview" text,
      "unread_count" integer DEFAULT 0 NOT NULL,
      "ai_auto_reply" boolean DEFAULT false NOT NULL,
      "created_at" timestamp with time zone DEFAULT now() NOT NULL,
      "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
      UNIQUE("workspace_id", "contact_id")
    )
  `

  await sql`CREATE INDEX IF NOT EXISTS "conversations_workspace_idx" ON "conversations"("workspace_id")`
  await sql`CREATE INDEX IF NOT EXISTS "conversations_status_idx" ON "conversations"("status")`
  await sql`CREATE INDEX IF NOT EXISTS "conversations_last_message_idx" ON "conversations"("last_message_at")`

  await sql`
    CREATE TABLE IF NOT EXISTS "messages" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "workspace_id" uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      "conversation_id" uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      "contact_id" uuid NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
      "direction" "message_direction" NOT NULL,
      "sender_type" "sender_type" NOT NULL,
      "body" text NOT NULL,
      "media_url" text,
      "media_type" "content_type",
      "wa_message_id" text UNIQUE,
      "status" "message_status" DEFAULT 'sent' NOT NULL,
      "is_note" boolean DEFAULT false NOT NULL,
      "ai_generated" boolean DEFAULT false NOT NULL,
      "created_at" timestamp with time zone DEFAULT now() NOT NULL
    )
  `

  await sql`CREATE INDEX IF NOT EXISTS "messages_conversation_idx" ON "messages"("conversation_id")`
  await sql`CREATE INDEX IF NOT EXISTS "messages_workspace_idx" ON "messages"("workspace_id")`
  await sql`CREATE INDEX IF NOT EXISTS "messages_wa_id_idx" ON "messages"("wa_message_id")`
  await sql`CREATE INDEX IF NOT EXISTS "messages_created_at_idx" ON "messages"("created_at")`

  await sql`
    CREATE TABLE IF NOT EXISTS "message_jobs" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "workspace_id" uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      "campaign_id" uuid REFERENCES campaigns(id) ON DELETE CASCADE,
      "campaign_message_id" uuid REFERENCES campaign_messages(id),
      "contact_id" uuid NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
      "status" "message_status" DEFAULT 'queued' NOT NULL,
      "error_message" text,
      "scheduled_at" timestamp with time zone,
      "sent_at" timestamp with time zone,
      "delivered_at" timestamp with time zone,
      "read_at" timestamp with time zone,
      "wa_message_id" text UNIQUE,
      "retry_count" integer DEFAULT 0 NOT NULL,
      "created_at" timestamp with time zone DEFAULT now() NOT NULL
    )
  `

  await sql`CREATE INDEX IF NOT EXISTS "message_jobs_workspace_idx" ON "message_jobs"("workspace_id")`
  await sql`CREATE INDEX IF NOT EXISTS "message_jobs_campaign_idx" ON "message_jobs"("campaign_id")`
  await sql`CREATE INDEX IF NOT EXISTS "message_jobs_status_idx" ON "message_jobs"("status")`

  await sql`
    CREATE TABLE IF NOT EXISTS "ai_memory" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "workspace_id" uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      "contact_id" uuid NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
      "extracted_name" text,
      "extracted_email" text,
      "extracted_data" jsonb DEFAULT '{}'::jsonb,
      "conversation_summary" text,
      "lead_score" integer DEFAULT 0 NOT NULL,
      "lead_captured_at" timestamp with time zone,
      "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
      UNIQUE("workspace_id", "contact_id")
    )
  `

  await sql`
    CREATE TABLE IF NOT EXISTS "leads" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "workspace_id" uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      "contact_id" uuid NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
      "conversation_id" uuid REFERENCES conversations(id),
      "name" text,
      "phone" text,
      "email" text,
      "raw_data" jsonb DEFAULT '{}'::jsonb,
      "pushed_to" text,
      "pushed_at" timestamp with time zone,
      "created_at" timestamp with time zone DEFAULT now() NOT NULL
    )
  `

  await sql`CREATE INDEX IF NOT EXISTS "leads_workspace_idx" ON "leads"("workspace_id")`

  await sql`
    CREATE TABLE IF NOT EXISTS "webhook_configs" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "workspace_id" uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      "name" text NOT NULL,
      "url" text NOT NULL,
      "events" text[] DEFAULT '{}' NOT NULL,
      "secret" text,
      "active" boolean DEFAULT true NOT NULL,
      "created_at" timestamp with time zone DEFAULT now() NOT NULL
    )
  `

  await sql`
    CREATE TABLE IF NOT EXISTS "brand_guides" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "workspace_id" uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      "name" text NOT NULL,
      "content" text NOT NULL,
      "conversion_goal" text,
      "is_active" boolean DEFAULT true NOT NULL,
      "created_at" timestamp with time zone DEFAULT now() NOT NULL
    )
  `

  await sql`
    CREATE TABLE IF NOT EXISTS "audit_log" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "workspace_id" uuid NOT NULL,
      "user_id" uuid,
      "action" text NOT NULL,
      "resource_type" text,
      "resource_id" uuid,
      "metadata" jsonb DEFAULT '{}'::jsonb,
      "created_at" timestamp with time zone DEFAULT now() NOT NULL
    )
  `

  await sql`CREATE INDEX IF NOT EXISTS "audit_log_workspace_idx" ON "audit_log"("workspace_id")`
  await sql`CREATE INDEX IF NOT EXISTS "audit_log_created_at_idx" ON "audit_log"("created_at")`

  console.log('✓ All tables created')
  console.log('\n✅ Migration complete! Database is ready.')

  await sql.end()
}

migrate().catch(err => {
  console.error('❌ Migration failed:', err.message)
  process.exit(1)
})
