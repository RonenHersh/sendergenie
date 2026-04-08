import 'dotenv/config'
import Fastify from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import rateLimit from '@fastify/rate-limit'
import multipart from '@fastify/multipart'
import { authMiddleware } from './middleware/auth.js'
import { authRoutes } from './routes/auth.js'
import { contactRoutes } from './routes/contacts.js'
import { campaignRoutes } from './routes/campaigns.js'
import { conversationRoutes } from './routes/conversations.js'
import { webhookRoutes } from './routes/webhooks.js'
import { settingsRoutes } from './routes/settings.js'
import { startSenderWorker } from './workers/sender.worker.js'
import { startAIResponderWorker } from './workers/ai-responder.worker.js'

const app = Fastify({
  logger: {
    transport: {
      target: 'pino-pretty',
      options: { colorize: true },
    },
  },
})

// ── Plugins ───────────────────────────────────────────────────────────────────

await app.register(cors, {
  origin: process.env['FRONTEND_URL'] ?? 'http://localhost:3000',
  credentials: true,
})

await app.register(jwt, {
  secret: process.env['JWT_SECRET']!,
})

await app.register(rateLimit, {
  max: 100,
  timeWindow: '1 minute',
})

await app.register(multipart, {
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
})

// Expose authenticate as a decorator for use in routes
app.decorate('authenticate', authMiddleware)

// ── Routes ─────────────────────────────────────────────────────────────────

// Public routes
await app.register(authRoutes)
await app.register(webhookRoutes)

// Protected routes (require JWT)
await app.register(async (protectedApp) => {
  protectedApp.addHook('preHandler', authMiddleware)
  await protectedApp.register(contactRoutes)
  await protectedApp.register(campaignRoutes)
  await protectedApp.register(conversationRoutes)
  await protectedApp.register(settingsRoutes)
}, { prefix: '/api' })

// ── Health check ──────────────────────────────────────────────────────────────

app.get('/health', async () => ({ status: 'ok', ts: new Date().toISOString() }))

// ── Start workers ─────────────────────────────────────────────────────────────

startSenderWorker()
startAIResponderWorker()

// ── Start server ──────────────────────────────────────────────────────────────

const PORT = Number(process.env['PORT'] ?? 3001)

try {
  await app.listen({ port: PORT, host: '0.0.0.0' })
  console.log(`\n🚀 SenderGenie API running on port ${PORT}`)
  console.log(`📡 Webhooks: POST /webhooks/:workspaceId`)
  console.log(`🔑 Auth: POST /auth/signup | POST /auth/login`)
} catch (err) {
  app.log.error(err)
  process.exit(1)
}
