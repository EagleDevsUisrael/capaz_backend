/**
 * Postulaciones de la persona.
 *
 * POST /api/applications                 { jobId } → crea la postulación (pantalla /applications/:id/sent)
 * GET  /api/applications                 "Mis postulaciones": estado, etapa 1–3 y entrevista
 * GET  /api/applications/:id             detalle con la línea de tiempo
 * POST /api/applications/:id/withdraw    retirar la postulación
 */
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { scoreJob } from '../domain/matchEngine.js'
import { Prisma } from '../generated/prisma/client.js'
import { conflict, notFound } from '../lib/errors.js'
import { candidateIdOf } from '../plugins/auth.js'
import { applicationDto, matchCandidateOf } from './dto.js'
import { idParam, uuid } from './schemas.js'

export const applicationRoutes: FastifyPluginAsyncZod = async (app) => {
  const auth = { preHandler: app.authenticate }
  const sec = { tags: ['postulaciones'], security: [{ session: [] }] }

  app.post('/applications', { ...auth, schema: { ...sec, body: z.object({ jobId: uuid }) } }, async (req, reply) => {
    const candidateId = candidateIdOf(req)
    const [c, job] = await Promise.all([
      app.db.candidate.findUnique({ where: { id: candidateId } }),
      app.db.job.findFirst({ where: { id: req.body.jobId, isActive: true } }),
    ])
    if (!c) throw notFound()
    if (!job) throw notFound('Esta oferta ya no está disponible.')

    const existing = await app.db.application.findUnique({
      where: { candidateId_jobId: { candidateId, jobId: job.id } },
      include: { job: true },
    })
    if (existing && existing.status !== 'withdrawn') {
      throw conflict('ALREADY_APPLIED', 'Ya postulaste a esta oferta. Mira el estado en "Mis postulaciones".')
    }

    // No se impide postular aunque el match sea bajo: la persona decide.
    const matchScore = scoreJob(matchCandidateOf(c), job).score
    try {
      const a = existing
        ? await app.db.application.update({
            where: { id: existing.id },
            data: { status: 'sent', matchScore, interviewAt: null, interviewPlace: null, events: { create: { status: 'sent' } } },
            include: { job: true },
          })
        : await app.db.application.create({
            data: { candidateId, jobId: job.id, matchScore, events: { create: { status: 'sent' } } },
            include: { job: true },
          })
      return reply.status(201).send(applicationDto(a))
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw conflict('ALREADY_APPLIED', 'Ya postulaste a esta oferta.')
      }
      throw e
    }
  })

  app.get('/applications', { ...auth, schema: sec }, async (req) => {
    const items = await app.db.application.findMany({
      where: { candidateId: candidateIdOf(req) },
      include: { job: true },
      orderBy: { updatedAt: 'desc' },
    })
    return { items: items.map(applicationDto) }
  })

  app.get('/applications/:id', { ...auth, schema: { ...sec, params: idParam } }, async (req) => {
    const a = await app.db.application.findFirst({
      where: { id: req.params.id, candidateId: candidateIdOf(req) },
      include: { job: true, events: { orderBy: { createdAt: 'asc' } } },
    })
    if (!a) throw notFound('No encontramos esta postulación.')
    return applicationDto(a)
  })

  app.post('/applications/:id/withdraw', { ...auth, schema: { ...sec, params: idParam } }, async (req) => {
    const a = await app.db.application.findFirst({ where: { id: req.params.id, candidateId: candidateIdOf(req) } })
    if (!a) throw notFound('No encontramos esta postulación.')
    const u = await app.db.application.update({
      where: { id: a.id },
      data: { status: 'withdrawn', events: { create: { status: 'withdrawn' } } },
      include: { job: true, events: { orderBy: { createdAt: 'asc' } } },
    })
    return applicationDto(u)
  })
}
