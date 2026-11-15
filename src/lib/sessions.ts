import type { FastifyInstance, FastifyRequest } from 'fastify'
import type { ConsentPurpose, Prisma } from '../generated/prisma/client.js'
import { newToken, sha256 } from './crypto.js'

type Tx = Prisma.TransactionClient

/** Crea una sesión y devuelve el token en claro (solo se guarda su hash). */
export async function createSession(app: FastifyInstance, candidateId: string, tx: Tx = app.db) {
  const token = newToken()
  const expiresAt = new Date(Date.now() + app.config.SESSION_TTL_DAYS * 24 * 60 * 60 * 1000)
  await tx.session.create({ data: { candidateId, tokenHash: sha256(token), expiresAt } })
  return { token, expiresAt: expiresAt.toISOString() }
}

/** Registra cada permiso con fecha, versión de la política, IP y navegador (LOPDP). */
export async function recordConsents(
  app: FastifyInstance,
  tx: Tx,
  req: FastifyRequest,
  candidateId: string,
  consents: Partial<Record<ConsentPurpose, boolean>>,
) {
  const rows = Object.entries(consents)
    .filter(([, v]) => v !== undefined)
    .map(([purpose, granted]) => ({
      candidateId,
      purpose: purpose as ConsentPurpose,
      granted: granted!,
      policyVersion: app.config.PRIVACY_POLICY_VERSION,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']?.slice(0, 300) ?? null,
    }))
  if (rows.length) await tx.consentRecord.createMany({ data: rows })
}
