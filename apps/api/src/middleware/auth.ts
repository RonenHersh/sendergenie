import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { db } from '../db/index.js'
import { users } from '../db/schema.js'
import { eq } from 'drizzle-orm'

// Extend Fastify request to include workspace context
declare module 'fastify' {
  interface FastifyRequest {
    workspaceId: string
    userId: string
    userRole: string
  }
}

export async function authMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    // Verify JWT (registered via @fastify/jwt)
    await request.jwtVerify()

    const payload = request.user as { sub: string; workspace_id: string; role: string }

    request.userId = payload.sub
    request.workspaceId = payload.workspace_id
    request.userRole = payload.role
  } catch {
    reply.status(401).send({ error: 'Unauthorized' })
  }
}

export function requireRole(...roles: string[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!roles.includes(request.userRole)) {
      reply.status(403).send({ error: 'Forbidden' })
    }
  }
}
