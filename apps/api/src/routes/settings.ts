/**
 * Settings routes — WhatsApp config, AI bot, brand guide
 */

import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { db } from '../db/index.js'
import { eq, and } from 'drizzle-orm'
import { workspaces, brandGuides } from '../db/schema.js'

export async function settingsRoutes(app: FastifyInstance): Promise<void> {

  // ── GET /settings ──────────────────────────────────────────────────────────
  app.get('/settings', async (request, reply) => {
    const workspaceId = request.workspaceId

    const [workspace] = await db
      .select()
      .from(workspaces)
      .where(eq(workspaces.id, workspaceId))
      .limit(1)

    if (!workspace) return reply.status(404).send({ error: 'Workspace not found' })

    const [brandGuide] = await db
      .select()
      .from(brandGuides)
      .where(and(eq(brandGuides.workspace_id, workspaceId), eq(brandGuides.is_active, true)))
      .limit(1)

    return reply.send({
      workspace: {
        id: workspace.id,
        name: workspace.name,
        plan: workspace.plan,
        whatsapp_provider: workspace.whatsapp_provider,
        whatsapp_config: workspace.whatsapp_config,
        ai_enabled: workspace.ai_enabled,
        ai_system_prompt: workspace.ai_system_prompt,
      },
      brand_guide: brandGuide ?? null,
    })
  })

  // ── POST /settings/whatsapp ────────────────────────────────────────────────
  // Save WaAPI or Meta credentials
  app.post('/settings/whatsapp', async (request, reply) => {
    const workspaceId = request.workspaceId

    const body = z.object({
      provider: z.enum(['waapi', 'meta']),
      config: z.record(z.string()),
    }).parse(request.body)

    await db
      .update(workspaces)
      .set({
        whatsapp_provider: body.provider,
        whatsapp_config: body.config,
        updated_at: new Date(),
      })
      .where(eq(workspaces.id, workspaceId))

    return reply.send({ ok: true })
  })

  // ── POST /settings/ai ──────────────────────────────────────────────────────
  // Save AI bot settings (toggle, tone, goal, system prompt, brand guide)
  app.post('/settings/ai', async (request, reply) => {
    const workspaceId = request.workspaceId

    const body = z.object({
      ai_enabled:      z.boolean(),
      ai_system_prompt: z.string().optional(),
      brand_guide_content: z.string().optional(),
      conversion_goal: z.string().optional(),
    }).parse(request.body)

    // Update workspace AI settings
    await db
      .update(workspaces)
      .set({
        ai_enabled: body.ai_enabled,
        ai_system_prompt: body.ai_system_prompt,
        updated_at: new Date(),
      })
      .where(eq(workspaces.id, workspaceId))

    // Upsert brand guide
    if (body.brand_guide_content !== undefined) {
      const [existing] = await db
        .select({ id: brandGuides.id })
        .from(brandGuides)
        .where(and(eq(brandGuides.workspace_id, workspaceId), eq(brandGuides.is_active, true)))
        .limit(1)

      if (existing) {
        await db
          .update(brandGuides)
          .set({
            content: body.brand_guide_content,
            conversion_goal: body.conversion_goal,
          })
          .where(eq(brandGuides.id, existing.id))
      } else {
        await db.insert(brandGuides).values({
          workspace_id: workspaceId,
          name: 'Default',
          content: body.brand_guide_content,
          conversion_goal: body.conversion_goal,
          is_active: true,
        })
      }
    }

    return reply.send({ ok: true })
  })

  // ── GET /settings/webhook-url ──────────────────────────────────────────────
  // Returns the webhook URL to paste in WaAPI / Meta dashboard
  app.get('/settings/webhook-url', async (request, reply) => {
    const workspaceId = request.workspaceId
    const baseUrl = process.env['API_PUBLIC_URL'] ?? 'http://localhost:3001'
    return reply.send({
      webhook_url: `${baseUrl}/webhooks/${workspaceId}`,
    })
  })
}
