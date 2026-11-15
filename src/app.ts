import cors from '@fastify/cors'
import multipart from '@fastify/multipart'
import rateLimit from '@fastify/rate-limit'
import swagger from '@fastify/swagger'
import swaggerUi from '@fastify/swagger-ui'
import Fastify, { type FastifyServerOptions } from 'fastify'
import {
  hasZodFastifySchemaValidationErrors,
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod'
import type { Env } from './config/env.js'
import { HttpError } from './lib/errors.js'
import type { Db } from './lib/prisma.js'
import { adminRoutes } from './modules/admin.js'
import { applicationRoutes } from './modules/applications.js'
import { authRoutes } from './modules/auth.js'
import { catalogRoutes } from './modules/catalog.js'
import { companyViewRoutes } from './modules/companyView.js'
import { cvRoutes } from './modules/cv.js'
import { idCardRoutes } from './modules/idCard.js'
import { jobRoutes } from './modules/jobs.js'
import { matchRoutes } from './modules/matches.js'
import { meRoutes } from './modules/me.js'
import { phoneRoutes } from './modules/phone.js'
import { signupRoutes } from './modules/signup.js'
import { voiceRoutes } from './modules/voice.js'
import { authPlugin } from './plugins/auth.js'
import { createMessagingProvider, type MessagingProvider } from './services/messaging.js'
import { createOcrProvider, type OcrProvider } from './services/ocr.js'
import {
  createTranscriptionProvider,
  createTtsProvider,
  type TranscriptionProvider,
  type TtsProvider,
} from './services/voice.js'

export interface Services {
  ocr: OcrProvider
  messaging: MessagingProvider
  transcription: TranscriptionProvider
  tts: TtsProvider
}

declare module 'fastify' {
  interface FastifyInstance {
    db: Db
    config: Env
    services: Services
  }
}

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024

export async function buildApp(opts: { db: Db; config: Env; services?: Partial<Services>; logger?: FastifyServerOptions['logger'] }) {
  const app = Fastify({
    logger: opts.logger ?? true,
    trustProxy: true,
  }).withTypeProvider<ZodTypeProvider>()

  app.setValidatorCompiler(validatorCompiler)
  app.setSerializerCompiler(serializerCompiler)

  app.decorate('db', opts.db)
  app.decorate('config', opts.config)
  app.decorate('services', {
    ocr: opts.services?.ocr ?? createOcrProvider(opts.config.OCR_PROVIDER),
    messaging: opts.services?.messaging ?? createMessagingProvider(opts.config.MESSAGING_PROVIDER, app.log),
    transcription: opts.services?.transcription ?? createTranscriptionProvider(opts.config.TRANSCRIBE_PROVIDER),
    tts: opts.services?.tts ?? createTtsProvider(opts.config.TTS_PROVIDER),
  })

  await app.register(cors, {
    origin: opts.config.CORS_ORIGINS,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['Content-Disposition'],
    maxAge: 600,
  })
  await app.register(rateLimit, { global: false })
  await app.register(multipart, { limits: { fileSize: MAX_UPLOAD_BYTES, files: 2, fields: 10 } })

  await app.register(swagger, {
    openapi: {
      info: {
        title: 'Capaz API',
        version: '0.1.0',
        description: 'API de Capaz: empleo para personas con discapacidad en Ecuador (ODS 10).',
      },
      components: {
        securitySchemes: {
          session: { type: 'http', scheme: 'bearer', description: 'Token de sesión de la persona candidata' },
          admin: { type: 'http', scheme: 'bearer', description: 'ADMIN_TOKEN del admin de demostración' },
        },
      },
    },
    transform: jsonSchemaTransform,
  })
  if (opts.config.NODE_ENV !== 'production') {
    await app.register(swaggerUi, { routePrefix: '/docs' })
  }

  app.setErrorHandler((error, req, reply) => {
    const err = error as Error & { statusCode?: number; code?: string }
    if (err instanceof HttpError) {
      return reply
        .status(err.statusCode)
        .send({ error: { code: err.code, message: err.message, ...(err.fields && { fields: err.fields }) } })
    }
    if (hasZodFastifySchemaValidationErrors(err)) {
      const fields: Record<string, string> = {}
      for (const v of err.validation) {
        const path = v.instancePath.replace(/^\//, '').replaceAll('/', '.') || '_'
        fields[path] ??= v.message ?? 'Dato inválido'
      }
      return reply.status(400).send({
        error: { code: 'VALIDATION_ERROR', message: 'Revisa los datos marcados.', fields },
      })
    }
    const status = err.statusCode ?? 500
    if (status === 413 || err.code === 'FST_REQ_FILE_TOO_LARGE') {
      return reply.status(413).send({
        error: { code: 'FILE_TOO_LARGE', message: 'El archivo pesa más de 10 MB. Prueba con una foto más liviana.' },
      })
    }
    if (status === 429) {
      return reply.status(429).send({
        error: { code: 'TOO_MANY_REQUESTS', message: 'Hiciste muchos intentos. Espera un momento y vuelve a intentarlo.' },
      })
    }
    if (status < 500) {
      return reply.status(status).send({ error: { code: 'BAD_REQUEST', message: err.message } })
    }
    req.log.error(err)
    return reply.status(500).send({
      error: { code: 'INTERNAL', message: 'Algo salió mal de nuestro lado. Inténtalo otra vez en un momento.' },
    })
  })

  app.setNotFoundHandler((_req, reply) =>
    reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Esta dirección no existe.' } }),
  )

  await app.register(authPlugin)

  await app.register(
    async (api) => {
      api.get('/health', { schema: { tags: ['sistema'] } }, async () => {
        await app.db.$queryRaw`SELECT 1`
        return { ok: true }
      })
      await api.register(catalogRoutes)
      await api.register(jobRoutes)
      await api.register(idCardRoutes)
      await api.register(phoneRoutes)
      await api.register(cvRoutes)
      await api.register(companyViewRoutes)
      await api.register(signupRoutes)
      await api.register(authRoutes)
      await api.register(meRoutes)
      await api.register(matchRoutes)
      await api.register(applicationRoutes)
      await api.register(voiceRoutes)
      await api.register(adminRoutes, { prefix: '/admin' })
    },
    { prefix: '/api' },
  )

  return app
}

export type App = Awaited<ReturnType<typeof buildApp>>
