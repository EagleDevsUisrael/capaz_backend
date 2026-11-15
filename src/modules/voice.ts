/**
 * Respaldos de voz del servidor.
 *
 * POST /api/transcribe   multipart (audio, lang?) → { text }    Firefox y navegadores sin SpeechRecognition
 * POST /api/tts          { text, rate? }           → audio       voz uniforme (tiene costo por carácter)
 *
 * El audio no se guarda.
 */
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { readMultipart, requireAudio } from '../lib/uploads.js'

export const voiceRoutes: FastifyPluginAsyncZod = async (app) => {
  app.post(
    '/transcribe',
    {
      schema: { tags: ['voz'], consumes: ['multipart/form-data'] },
      config: { rateLimit: { max: 20, timeWindow: '1 minute' } },
    },
    async (req) => {
      const { files, fields } = await readMultipart(req)
      const audio = requireAudio(files)
      const lang = /^[a-z]{2}(-[A-Z]{2})?$/.test(fields.lang ?? '') ? fields.lang! : 'es-EC'
      return app.services.transcription.transcribe({ ...audio, lang })
    },
  )

  app.post(
    '/tts',
    {
      schema: {
        tags: ['voz'],
        body: z.object({
          text: z.string().trim().min(1).max(2000),
          rate: z.union([z.literal(0.8), z.literal(1), z.literal(1.25)]).default(1),
        }),
      },
      config: { rateLimit: { max: 30, timeWindow: '1 minute' } },
    },
    async (req, reply) => {
      const { audio, mime } = await app.services.tts.synthesize({ text: req.body.text, rate: req.body.rate, lang: 'es-EC' })
      return reply.header('Content-Type', mime).header('Cache-Control', 'no-store').send(audio)
    },
  )
}
