import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { db } from '../db/index.js'
import { contacts, blacklist } from '../db/schema.js'
import { eq, and, ilike, sql } from 'drizzle-orm'
import { normalizePhone } from '@sendergenie/shared'
import { parse as csvParse } from 'csv-parse/sync'
import * as XLSX from 'xlsx'

const CreateContactSchema = z.object({
  phone: z.string().min(7),
  name: z.string().optional(),
  email: z.string().email().optional(),
  tags: z.array(z.string()).default([]),
  custom_fields: z.record(z.string()).default({}),
})

const BulkImportSchema = z.object({
  contacts: z.array(z.object({
    phone: z.string(),
    name: z.string().optional(),
    email: z.string().optional(),
    tags: z.array(z.string()).default([]),
  })),
  default_tags: z.array(z.string()).default([]),
  default_country: z.string().default('IL'),
})

export async function contactRoutes(app: FastifyInstance): Promise<void> {
  // ── GET /contacts ──────────────────────────────────────────────────────────
  app.get('/contacts', async (request, reply) => {
    const workspaceId = request.workspaceId
    const query = request.query as { search?: string; tag?: string; limit?: string; offset?: string }

    const limit = Math.min(Number(query.limit ?? 50), 200)
    const offset = Number(query.offset ?? 0)

    const rows = await db
      .select()
      .from(contacts)
      .where(and(
        eq(contacts.workspace_id, workspaceId),
        query.search ? ilike(contacts.name, `%${query.search}%`) : undefined,
        query.tag ? sql`${contacts.tags} @> ARRAY[${query.tag}]::text[]` : undefined,
      ))
      .limit(limit)
      .offset(offset)
      .orderBy(contacts.created_at)

    return reply.send({ contacts: rows, limit, offset })
  })

  // ── POST /contacts ─────────────────────────────────────────────────────────
  app.post('/contacts', async (request, reply) => {
    const workspaceId = request.workspaceId
    const body = CreateContactSchema.parse(request.body)

    const phone = normalizePhone(body.phone)
    if (!phone) {
      return reply.status(400).send({ error: 'Invalid phone number' })
    }

    const [contact] = await db
      .insert(contacts)
      .values({
        workspace_id: workspaceId,
        phone,
        name: body.name,
        email: body.email,
        tags: body.tags,
        custom_fields: body.custom_fields,
      })
      .onConflictDoUpdate({
        target: [contacts.workspace_id, contacts.phone],
        set: {
          name: body.name,
          email: body.email,
          tags: body.tags,
          updated_at: new Date(),
        },
      })
      .returning()

    return reply.status(201).send({ contact })
  })

  // ── POST /contacts/import ──────────────────────────────────────────────────
  app.post('/contacts/import', async (request, reply) => {
    const workspaceId = request.workspaceId
    const body = BulkImportSchema.parse(request.body)

    let imported = 0
    let duplicates = 0
    let failed = 0
    const errors: string[] = []

    for (const raw of body.contacts) {
      const phone = normalizePhone(raw.phone, body.default_country as 'IL' | 'US')
      if (!phone) {
        failed++
        errors.push(`Invalid phone: ${raw.phone}`)
        continue
      }

      const tags = [...new Set([...raw.tags, ...body.default_tags])]

      const result = await db
        .insert(contacts)
        .values({
          workspace_id: workspaceId,
          phone,
          name: raw.name,
          email: raw.email,
          tags,
          custom_fields: {},
        })
        .onConflictDoUpdate({
          target: [contacts.workspace_id, contacts.phone],
          set: {
            name: raw.name ?? contacts.name,
            tags: sql`array_distinct(${contacts.tags} || ARRAY[${sql.join(tags.map(t => sql`${t}::text`), sql`, `)}]::text[])`,
            updated_at: new Date(),
          },
        })
        .returning({ id: contacts.id, created_at: contacts.created_at })

      const isNew = result[0] && new Date(result[0].created_at).getTime() > Date.now() - 5000
      if (isNew) {
        imported++
      } else {
        duplicates++
      }
    }

    return reply.send({ imported, duplicates, failed, errors: errors.slice(0, 10) })
  })

  // ── POST /contacts/import/csv ── handles CSV + Excel (.xlsx/.xls) ──────────
  app.post('/contacts/import/csv', async (request, reply) => {
    const workspaceId = request.workspaceId
    const data = await request.file()
    if (!data) return reply.status(400).send({ error: 'No file uploaded' })

    const fileBuffer = await data.toBuffer()

    let rows: Record<string, string>[] = []

    // Try Excel first, then fall back to CSV
    try {
      const wb = XLSX.read(fileBuffer, { type: 'buffer' })
      const ws = wb.Sheets[wb.SheetNames[0]!]
      if (!ws) return reply.status(400).send({ error: 'Empty Excel file' })
      rows = XLSX.utils.sheet_to_json<Record<string, string>>(ws, { defval: '' })
    } catch {
      // Not Excel — try CSV
      try {
        rows = csvParse(fileBuffer.toString('utf-8'), {
          columns: true,
          skip_empty_lines: true,
          trim: true,
        }) as Record<string, string>[]
      } catch {
        return reply.status(400).send({ error: 'Invalid file format. Please upload .xlsx, .xls or .csv' })
      }
    }

    if (rows.length === 0) return reply.status(400).send({ error: 'File is empty' })

    // Auto-detect phone column
    const firstRow = rows[0] ?? {}
    const phoneColumn = Object.keys(firstRow).find(k =>
      ['phone', 'mobile', 'טלפון', 'נייד', 'מספר'].some(p => k.toLowerCase().includes(p))
    ) ?? Object.keys(firstRow)[0] // fallback: first column

    const nameColumn = Object.keys(firstRow).find(k =>
      ['name', 'שם', 'fullname', 'first_name', 'שם מלא'].some(p => k.toLowerCase().includes(p))
    )

    if (!phoneColumn) return reply.status(400).send({ error: 'Could not detect phone column' })

    const contacts_data = rows
      .map(row => ({
        phone: String(row[phoneColumn] ?? '').trim(),
        name:  nameColumn ? String(row[nameColumn] ?? '').trim() || undefined : undefined,
      }))
      .filter(r => r.phone)

    let imported = 0; let failed = 0
    for (const raw of contacts_data) {
      const phone = normalizePhone(raw.phone)
      if (!phone) { failed++; continue }
      await db
        .insert(contacts)
        .values({ workspace_id: workspaceId, phone, name: raw.name, tags: [] })
        .onConflictDoNothing()
      imported++
    }

    return reply.send({ imported, failed, total: contacts_data.length })
  })

  // ── GET /contacts/:id ──────────────────────────────────────────────────────
  app.get('/contacts/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const workspaceId = request.workspaceId

    const [contact] = await db
      .select()
      .from(contacts)
      .where(and(eq(contacts.id, id), eq(contacts.workspace_id, workspaceId)))
      .limit(1)

    if (!contact) return reply.status(404).send({ error: 'Not found' })

    return reply.send({ contact })
  })

  // ── DELETE /contacts/:id/blacklist ─────────────────────────────────────────
  app.post('/contacts/:id/blacklist', async (request, reply) => {
    const { id } = request.params as { id: string }
    const workspaceId = request.workspaceId
    const body = request.body as { reason?: string }

    const [contact] = await db
      .select()
      .from(contacts)
      .where(and(eq(contacts.id, id), eq(contacts.workspace_id, workspaceId)))
      .limit(1)

    if (!contact) return reply.status(404).send({ error: 'Not found' })

    await db
      .insert(blacklist)
      .values({ workspace_id: workspaceId, phone: contact.phone, reason: body.reason })
      .onConflictDoNothing()

    await db
      .update(contacts)
      .set({ opted_out: true })
      .where(eq(contacts.id, id))

    return reply.send({ ok: true })
  })
}
