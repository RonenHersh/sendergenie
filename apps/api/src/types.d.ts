import '@fastify/jwt'
import { FastifyInstance } from 'fastify'

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: import('fastify').FastifyRequest, reply: import('fastify').FastifyReply) => Promise<void>
  }
  interface FastifyRequest {
    workspaceId: string
  }
}
