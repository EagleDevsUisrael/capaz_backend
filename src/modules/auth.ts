/**
 * Ingreso sin contraseña: cédula + código de 4 dígitos por WhatsApp o SMS.
 *
 * POST /api/auth/code    { idNumber, channel? }  → siempre la misma respuesta, exista o no la cuenta,
 *                         para no revelar quién está registrado en una plataforma de discapacidad.
 * POST /api/auth/verify  { idNumber, code }      → { token, expiresAt, candidate }
 * POST /api/auth/logout                           → cierra la sesión actual
 */
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { newLoginCode, safeEqualHex, sha256 } from '../lib/crypto.js'
import { HttpError, tooMany } from '../lib/errors.js'
import { createSession } from '../lib/sessions.js'
import { profileDto } from './dto.js'
import { cedula } from './schemas.js'

export const CODE_TTL_MS = 10 * 60 * 1000
export const MAX_ATTEMPTS = 5
const RESEND_AFTER_MS = 60 * 1000
const MAX_CODES_PER_HOUR = 5

/** El hash del código incluye el id de la persona: dos personas con el mismo código no comparten hash. */
const codeHash = (candidateId: string, code: string) => sha256(`${candidateId}:${code}`)

const invalidCode = () =>
  new HttpError(401, 'INVALID_CODE', 'El código no es correcto o ya venció. Revisa el mensaje o pide uno nuevo.')

export const authRoutes: FastifyPluginAsyncZod = async (app) => {
  app.post(
    '/auth/code',
    {
      schema: {
        tags: ['ingreso'],
        body: z.object({ idNumber: cedula, channel: z.enum(['whatsapp', 'sms']).optional() }),
      },
      config: { rateLimit: { max: 5, timeWindow: '1 minute' } },
    },
    async (req, reply) => {
      const generic = {
        message: 'Si tu cédula está registrada, te enviamos un código de 4 dígitos. Vence en 10 minutos.',
      }
      const c = await app.db.candidate.findUnique({
        where: { idNumber: req.body.idNumber },
        select: { id: true, phone: true, contactPreference: true, isTest: true },
      })
      if (!c || c.isTest) return reply.status(202).send(generic)

      const recent = await app.db.loginCode.findMany({
        where: { candidateId: c.id, createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) } },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
      })
      if (recent.length >= MAX_CODES_PER_HOUR) throw tooMany('Pediste muchos códigos. Espera una hora e inténtalo otra vez.')
      if (recent[0] && Date.now() - recent[0].createdAt.getTime() < RESEND_AFTER_MS) {
        throw tooMany('Ya te enviamos un código. Espera un minuto antes de pedir otro.')
      }

      const channel = req.body.channel ?? (c.contactPreference === 'whatsapp' ? 'whatsapp' : 'sms')
      const code = newLoginCode()
      await app.db.$transaction([
        // Un código nuevo invalida los anteriores
        app.db.loginCode.updateMany({
          where: { candidateId: c.id, consumedAt: null },
          data: { consumedAt: new Date() },
        }),
        app.db.loginCode.create({
          data: { candidateId: c.id, codeHash: codeHash(c.id, code), channel, expiresAt: new Date(Date.now() + CODE_TTL_MS) },
        }),
      ])
      await app.services.messaging.sendCode({ phone: c.phone, channel, code, purpose: 'login' })

      return reply.status(202).send({ ...generic, ...(app.config.EXPOSE_DEV_LOGIN_CODE && { devCode: code }) })
    },
  )

  app.post(
    '/auth/verify',
    {
      schema: {
        tags: ['ingreso'],
        body: z.object({ idNumber: cedula, code: z.string().regex(/^\d{4}$/, { error: 'El código tiene 4 dígitos' }) }),
      },
      config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
    },
    async (req) => {
      const c = await app.db.candidate.findUnique({ where: { idNumber: req.body.idNumber } })
      if (!c || c.isTest) throw invalidCode()
      const lc = await app.db.loginCode.findFirst({
        where: { candidateId: c.id, consumedAt: null, expiresAt: { gt: new Date() } },
        orderBy: { createdAt: 'desc' },
      })
      if (!lc || lc.attempts >= MAX_ATTEMPTS) throw invalidCode()

      if (!safeEqualHex(lc.codeHash, codeHash(c.id, req.body.code))) {
        const attempts = lc.attempts + 1
        await app.db.loginCode.update({
          where: { id: lc.id },
          data: { attempts, ...(attempts >= MAX_ATTEMPTS && { consumedAt: new Date() }) },
        })
        if (attempts >= MAX_ATTEMPTS) {
          throw new HttpError(401, 'CODE_LOCKED', 'Escribiste mal el código muchas veces. Pide un código nuevo.')
        }
        throw invalidCode()
      }

      await app.db.loginCode.update({ where: { id: lc.id }, data: { consumedAt: new Date() } })
      const session = await createSession(app, c.id)
      return { ...session, candidate: profileDto(c) }
    },
  )

  app.post(
    '/auth/logout',
    { schema: { tags: ['ingreso'], security: [{ session: [] }] }, preHandler: app.authenticate },
    async (req, reply) => {
      await app.db.session.update({ where: { id: req.sessionId! }, data: { revokedAt: new Date() } })
      return reply.status(204).send()
    },
  )
}
