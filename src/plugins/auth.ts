import type { FastifyReply, FastifyRequest } from 'fastify'
import fp from 'fastify-plugin'
import { createHash, timingSafeEqual } from 'node:crypto'
import { sha256 } from '../lib/crypto.js'
import { forbidden, unauthorized } from '../lib/errors.js'

declare module 'fastify' {
  interface FastifyRequest {
    /** Persona con sesión válida (lo llena `authenticate` u `optionalAuth`) */
    candidateId: string | null
    sessionId: string | null
  }
  interface FastifyInstance {
    /** preHandler: exige `Authorization: Bearer <token de sesión>` */
    authenticate: (req: FastifyRequest, reply: FastifyReply) => Promise<void>
    /** preHandler: si hay token válido, llena candidateId; si no, sigue sin sesión */
    optionalAuth: (req: FastifyRequest, reply: FastifyReply) => Promise<void>
    /** preHandler: exige `Authorization: Bearer <ADMIN_TOKEN>` */
    requireAdmin: (req: FastifyRequest, reply: FastifyReply) => Promise<void>
  }
}

const bearer = (req: FastifyRequest) => {
  const h = req.headers.authorization
  return h?.startsWith('Bearer ') ? h.slice(7).trim() : null
}

export const authPlugin = fp(async (app) => {
  app.decorateRequest('candidateId', null)
  app.decorateRequest('sessionId', null)

  async function resolve(req: FastifyRequest) {
    const token = bearer(req)
    if (!token) return false
    const session = await app.db.session.findUnique({
      where: { tokenHash: sha256(token) },
      select: { id: true, candidateId: true, expiresAt: true, revokedAt: true },
    })
    if (!session || session.revokedAt || session.expiresAt < new Date()) return false
    req.candidateId = session.candidateId
    req.sessionId = session.id
    return true
  }

  app.decorate('authenticate', async (req: FastifyRequest) => {
    if (!(await resolve(req))) throw unauthorized()
  })

  app.decorate('optionalAuth', async (req: FastifyRequest) => {
    await resolve(req)
  })

  app.decorate('requireAdmin', async (req: FastifyRequest) => {
    const token = bearer(req)
    if (!token) throw unauthorized('Falta el token del admin.')
    const a = createHash('sha256').update(token).digest()
    const b = createHash('sha256').update(app.config.ADMIN_TOKEN).digest()
    if (!timingSafeEqual(a, b)) throw forbidden('Token del admin incorrecto.')
  })
})

/** Para handlers con `authenticate`: el id de la persona, sin null. */
export function candidateIdOf(req: FastifyRequest): string {
  if (!req.candidateId) throw unauthorized()
  return req.candidateId
}
