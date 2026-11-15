/**
 * Verificación del celular con el mismo código de 4 dígitos del ingreso (simulado en la demo).
 * El login envía el código a este número, así que no se crea la cuenta ni se cambia el número sin verificarlo.
 *
 * POST /api/phone-verifications               { phone, channel? } → { verificationId, expiresAt, channel, devCode? }
 * POST /api/phone-verifications/:id/verify    { code }            → { verified: true, phone, usableUntil }
 *
 * Después, `verificationId` se manda como `phoneVerificationId` en POST /api/signup (o en PATCH /api/me
 * si cambia el número). Cada verificación sirve una sola vez y por 30 minutos.
 */
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import type { Prisma } from '../generated/prisma/client.js'
import { newLoginCode, safeEqualHex, sha256 } from '../lib/crypto.js'
import { HttpError, notFound, tooMany, unprocessable } from '../lib/errors.js'
import { idParam, phone as phoneSchema } from './schemas.js'

export const CODE_TTL_MS = 10 * 60 * 1000
/** Tiempo para terminar el registro después de verificar */
export const VERIFIED_TTL_MS = 30 * 60 * 1000
const MAX_ATTEMPTS = 5
/** "¿No llegó? Reenviar en 0:45" */
export const RESEND_AFTER_SECONDS = 45
const RESEND_AFTER_MS = RESEND_AFTER_SECONDS * 1000
const MAX_PER_HOUR = 5

const codeHash = (verificationId: string, code: string) => sha256(`phone:${verificationId}:${code}`)

const invalidCode = () =>
  new HttpError(401, 'INVALID_CODE', 'El código no es correcto o ya venció. Revisa el mensaje o pide uno nuevo.')

/**
 * Usa una verificación (dentro de la transacción del registro o del cambio de número).
 * Falla si no existe, no se verificó, es de otro número, ya se usó o pasaron más de 30 minutos.
 */
export async function consumeVerifiedPhone(tx: Prisma.TransactionClient, verificationId: string, phone: string) {
  const v = await tx.phoneVerification.findUnique({ where: { id: verificationId } })
  const ok =
    v &&
    v.phone === phone &&
    v.verifiedAt &&
    !v.consumedAt &&
    Date.now() - v.verifiedAt.getTime() <= VERIFIED_TTL_MS
  if (!ok) {
    throw unprocessable('PHONE_NOT_VERIFIED', 'Confirma tu celular con el código de 4 dígitos antes de continuar.', {
      phoneVerificationId: 'Celular sin verificar',
    })
  }
  // updateMany con condición: si dos pedidos llegan a la vez, solo uno la usa
  const { count } = await tx.phoneVerification.updateMany({
    where: { id: v.id, consumedAt: null },
    data: { consumedAt: new Date() },
  })
  if (count !== 1) {
    throw unprocessable('PHONE_NOT_VERIFIED', 'Confirma tu celular con el código de 4 dígitos antes de continuar.')
  }
  return v.verifiedAt!
}

export const phoneRoutes: FastifyPluginAsyncZod = async (app) => {
  app.post(
    '/phone-verifications',
    {
      schema: {
        tags: ['registro'],
        body: z.object({ phone: phoneSchema, channel: z.enum(['whatsapp', 'sms']).default('whatsapp') }),
      },
      config: { rateLimit: { max: 5, timeWindow: '1 minute' } },
    },
    async (req, reply) => {
      const { phone, channel } = req.body
      const recent = await app.db.phoneVerification.findMany({
        where: { phone, createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) } },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
      })
      if (recent.length >= MAX_PER_HOUR) throw tooMany('Pediste muchos códigos para este número. Espera una hora.')
      if (recent[0] && Date.now() - recent[0].createdAt.getTime() < RESEND_AFTER_MS) {
        throw tooMany(`Ya te enviamos un código. Espera ${RESEND_AFTER_SECONDS} segundos antes de pedir otro.`)
      }

      const code = newLoginCode()
      const v = await app.db.$transaction(async (tx) => {
        const created = await tx.phoneVerification.create({
          data: { phone, channel, codeHash: '', expiresAt: new Date(Date.now() + CODE_TTL_MS) },
        })
        return tx.phoneVerification.update({ where: { id: created.id }, data: { codeHash: codeHash(created.id, code) } })
      })
      await app.services.messaging.sendCode({ phone, channel, code, purpose: 'phoneVerification' })

      return reply.status(202).send({
        verificationId: v.id,
        channel,
        resendAfterSeconds: RESEND_AFTER_SECONDS,
        expiresAt: v.expiresAt.toISOString(),
        ...(app.config.EXPOSE_DEV_LOGIN_CODE && { devCode: code }),
      })
    },
  )

  app.post(
    '/phone-verifications/:id/verify',
    {
      schema: {
        tags: ['registro'],
        params: idParam,
        body: z.object({ code: z.string().regex(/^\d{4}$/, { error: 'El código tiene 4 dígitos' }) }),
      },
      config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
    },
    async (req) => {
      const v = await app.db.phoneVerification.findUnique({ where: { id: req.params.id } })
      if (!v) throw notFound('No encontramos esta verificación. Pide un código nuevo.')
      if (v.verifiedAt && !v.consumedAt) {
        return { verified: true, phone: v.phone, usableUntil: new Date(v.verifiedAt.getTime() + VERIFIED_TTL_MS).toISOString() }
      }
      if (v.consumedAt || v.expiresAt < new Date() || v.attempts >= MAX_ATTEMPTS) throw invalidCode()

      if (!safeEqualHex(v.codeHash, codeHash(v.id, req.body.code))) {
        const attempts = v.attempts + 1
        await app.db.phoneVerification.update({ where: { id: v.id }, data: { attempts } })
        if (attempts >= MAX_ATTEMPTS) {
          throw new HttpError(401, 'CODE_LOCKED', 'Escribiste mal el código muchas veces. Pide un código nuevo.')
        }
        throw invalidCode()
      }

      const verifiedAt = new Date()
      await app.db.phoneVerification.update({ where: { id: v.id }, data: { verifiedAt } })
      return { verified: true, phone: v.phone, usableUntil: new Date(verifiedAt.getTime() + VERIFIED_TTL_MS).toISOString() }
    },
  )
}
