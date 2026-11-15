/**
 * Hoja de vida (paso 3, opcional): PDF, Word, JPG o PNG de hasta 10 MB, guardada cifrada.
 *
 * POST   /api/cv-uploads   multipart (file) → { cvUploadId, fileName, sizeBytes, expiresAt }
 *                          Antes de tener cuenta. Se vincula con `cvUploadId` en POST /api/signup; si no, se borra a las 2 h.
 * GET    /api/me/cv        descarga la hoja de vida de la persona
 * PUT    /api/me/cv        multipart (file) → reemplaza la hoja de vida
 * DELETE /api/me/cv        la borra
 */
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import type { Prisma } from '../generated/prisma/client.js'
import { decrypt, encrypt } from '../lib/crypto.js'
import { notFound, unprocessable } from '../lib/errors.js'
import { readMultipart, requireCv } from '../lib/uploads.js'
import { candidateIdOf } from '../plugins/auth.js'

export const CV_UPLOAD_TTL_MS = 2 * 60 * 60 * 1000

/** Vincula una hoja de vida subida antes del registro (dentro de la transacción del registro). */
export async function claimCvUpload(tx: Prisma.TransactionClient, cvUploadId: string, candidateId: string) {
  const { count } = await tx.cvFile.updateMany({
    where: { id: cvUploadId, candidateId: null, expiresAt: { gt: new Date() } },
    data: { candidateId, expiresAt: null },
  })
  if (count !== 1) {
    throw unprocessable('CV_UPLOAD_NOT_FOUND', 'No encontramos tu hoja de vida. Vuelve a subirla en el paso 3.', {
      cvUploadId: 'Hoja de vida no encontrada o vencida',
    })
  }
  const cv = await tx.cvFile.findUniqueOrThrow({ where: { id: cvUploadId }, select: { fileName: true } })
  return cv.fileName
}

export const cvRoutes: FastifyPluginAsyncZod = async (app) => {
  const limit = { rateLimit: { max: 10, timeWindow: '1 minute' } }

  app.post(
    '/cv-uploads',
    { schema: { tags: ['registro'], consumes: ['multipart/form-data'] }, config: limit },
    async (req, reply) => {
      const { files } = await readMultipart(req)
      const cv = requireCv(files)
      const saved = await app.db.cvFile.create({
        data: {
          fileName: cv.fileName,
          mime: cv.mime,
          sizeBytes: cv.data.length,
          data: encrypt(cv.data),
          expiresAt: new Date(Date.now() + CV_UPLOAD_TTL_MS),
        },
        select: { id: true, fileName: true, sizeBytes: true, expiresAt: true },
      })
      return reply.status(201).send({
        cvUploadId: saved.id,
        fileName: saved.fileName,
        sizeBytes: saved.sizeBytes,
        expiresAt: saved.expiresAt!.toISOString(),
      })
    },
  )

  const auth = { preHandler: app.authenticate }
  const sec = { tags: ['perfil'], security: [{ session: [] }] }

  app.get('/me/cv', { ...auth, schema: sec }, async (req, reply) => {
    const cv = await app.db.cvFile.findUnique({ where: { candidateId: candidateIdOf(req) } })
    if (!cv) throw notFound('No subiste una hoja de vida.')
    return reply
      .header('Content-Type', cv.mime)
      .header('Content-Disposition', `attachment; filename="${cv.fileName}"`)
      .header('Cache-Control', 'no-store')
      .send(decrypt(cv.data))
  })

  app.put('/me/cv', { ...auth, schema: { ...sec, consumes: ['multipart/form-data'] }, config: limit }, async (req) => {
    const candidateId = candidateIdOf(req)
    const { files } = await readMultipart(req)
    const cv = requireCv(files)
    const data = { fileName: cv.fileName, mime: cv.mime, sizeBytes: cv.data.length, data: encrypt(cv.data), expiresAt: null }
    await app.db.$transaction([
      app.db.cvFile.upsert({ where: { candidateId }, create: { ...data, candidateId }, update: data }),
      app.db.candidate.update({ where: { id: candidateId }, data: { cvFileName: cv.fileName } }),
    ])
    return { fileName: cv.fileName, sizeBytes: cv.data.length }
  })

  app.delete('/me/cv', { ...auth, schema: sec }, async (req, reply) => {
    const candidateId = candidateIdOf(req)
    const { count } = await app.db.cvFile.deleteMany({ where: { candidateId } })
    if (!count) throw notFound('No subiste una hoja de vida.')
    await app.db.candidate.update({ where: { id: candidateId }, data: { cvFileName: null } })
    return reply.status(204).send()
  })
}
