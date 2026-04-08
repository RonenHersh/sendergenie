import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { db } from '../db/index.js'
import { users, workspaces } from '../db/schema.js'
import { eq } from 'drizzle-orm'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env['SUPABASE_URL']!,
  process.env['SUPABASE_SERVICE_ROLE_KEY']!
)

const SignupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(2),
  workspace_name: z.string().min(2),
})

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
})

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50)
}

export async function authRoutes(app: FastifyInstance): Promise<void> {
  // ── POST /auth/signup ──────────────────────────────────────────────────────
  app.post('/auth/signup', async (request, reply) => {
    const body = SignupSchema.parse(request.body)

    // Create user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: body.email,
      password: body.password,
      email_confirm: true,
    })

    if (authError || !authData.user) {
      return reply.status(400).send({ error: authError?.message ?? 'Signup failed' })
    }

    // Generate unique slug for workspace
    const baseSlug = slugify(body.workspace_name)
    const slug = `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`

    // Create workspace
    const [workspace] = await db
      .insert(workspaces)
      .values({
        name: body.workspace_name,
        slug,
        plan: 'free',
        monthly_message_limit: 100,
      })
      .returning()

    if (!workspace) {
      return reply.status(500).send({ error: 'Failed to create workspace' })
    }

    // Create user record
    const [user] = await db
      .insert(users)
      .values({
        workspace_id: workspace.id,
        supabase_auth_id: authData.user.id,
        email: body.email,
        name: body.name,
        role: 'owner',
      })
      .returning()

    if (!user) {
      return reply.status(500).send({ error: 'Failed to create user' })
    }

    // Issue JWT
    const token = await reply.jwtSign({
      sub: user.id,
      workspace_id: workspace.id,
      role: 'owner',
    }, { expiresIn: '30d' })

    return reply.status(201).send({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      workspace: { id: workspace.id, name: workspace.name, slug: workspace.slug, plan: workspace.plan },
    })
  })

  // ── POST /auth/login ───────────────────────────────────────────────────────
  app.post('/auth/login', async (request, reply) => {
    const body = LoginSchema.parse(request.body)

    // Verify with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: body.email,
      password: body.password,
    })

    if (authError || !authData.user) {
      return reply.status(401).send({ error: 'Invalid email or password' })
    }

    // Find our user record
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.supabase_auth_id, authData.user.id))
      .limit(1)

    if (!user) {
      return reply.status(404).send({ error: 'User not found' })
    }

    // Load workspace
    const [workspace] = await db
      .select()
      .from(workspaces)
      .where(eq(workspaces.id, user.workspace_id))
      .limit(1)

    // Issue JWT
    const token = await reply.jwtSign({
      sub: user.id,
      workspace_id: user.workspace_id,
      role: user.role,
    }, { expiresIn: '30d' })

    return reply.send({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      workspace,
    })
  })

  // ── GET /auth/me ───────────────────────────────────────────────────────────
  app.get('/auth/me', { preHandler: [app.authenticate] }, async (request, reply) => {
    const payload = request.user as { sub: string; workspace_id: string }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, payload.sub))
      .limit(1)

    const [workspace] = await db
      .select()
      .from(workspaces)
      .where(eq(workspaces.id, payload.workspace_id))
      .limit(1)

    if (!user || !workspace) return reply.status(404).send({ error: 'Not found' })

    return reply.send({ user, workspace })
  })
}
