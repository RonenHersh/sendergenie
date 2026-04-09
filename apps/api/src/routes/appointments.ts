import type { FastifyInstance } from 'fastify'
import { db } from '../db/index.js'
import { eq, and, desc } from 'drizzle-orm'
import { appointments } from '../db/schema.js'

export async function appointmentRoutes(app: FastifyInstance): Promise<void> {

  // GET /api/appointments
  app.get('/appointments', async (request, reply) => {
    const workspaceId = request.workspaceId

    const rows = await db
      .select()
      .from(appointments)
      .where(eq(appointments.workspace_id, workspaceId))
      .orderBy(desc(appointments.scheduled_at))
      .limit(100)

    return reply.send({ appointments: rows })
  })

  // PATCH /api/appointments/:id — update status
  app.patch('/appointments/:id', async (request, reply) => {
    const workspaceId = request.workspaceId
    const { id } = request.params as { id: string }
    const { status } = request.body as { status: string }

    await db
      .update(appointments)
      .set({ status })
      .where(and(eq(appointments.id, id), eq(appointments.workspace_id, workspaceId)))

    return reply.send({ ok: true })
  })
}
