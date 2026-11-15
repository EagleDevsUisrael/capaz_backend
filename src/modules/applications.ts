/**
 * Postulaciones de la persona.
 *
 * POST /api/applications                          { jobId } → la postulación con `nextSteps` (pantalla "Postulación enviada")
 * GET  /api/applications                          "Mis postulaciones": estado, etapa 1–3, entrevista, ofertas parecidas
 * GET  /api/applications/:id                      detalle con la línea de tiempo
 * POST /api/applications/:id/confirm-interview    "Confirmar asistencia"
 * GET  /api/applications/:id/similar              "Te recomendamos N ofertas parecidas" (para las no seleccionadas)
 * POST /api/applications/:id/withdraw             retirar la postulación (no aparece en los mockups)
 */
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { scoreJob, type MatchCandidate } from '../domain/matchEngine.js'
import { Prisma, type Job } from '../generated/prisma/client.js'
import { conflict, notFound, unprocessable } from '../lib/errors.js'
import { candidateIdOf } from '../plugins/auth.js'
import { applicationDto, jobDto, matchCandidateOf } from './dto.js'
import { idParam, uuid } from './schemas.js'

export const SIMILAR_LIMIT = 4

/**
 * Ofertas parecidas a `ref` para la persona: activas, a las que no postuló y no descartadas por el match.
 * Ordena por palabras clave en común con `ref`, misma modalidad y luego por compatibilidad.
 */
export function similarJobs(mc: MatchCandidate, ref: Job, jobs: Job[], appliedJobIds: Set<string>, limit = SIMILAR_LIMIT) {
  const refKeywords = new Set(ref.keywords)
  return jobs
    .filter((j) => j.id !== ref.id && !appliedJobIds.has(j.id))
    .map((j) => ({ job: j, match: scoreJob(mc, j) }))
    .filter((x) => !x.match.rejected)
    .map((x) => ({
      ...x,
      rank:
        x.job.keywords.filter((k) => refKeywords.has(k)).length * 20 +
        (x.job.modality === ref.modality ? 5 : 0) +
        x.match.score,
    }))
    .sort((a, b) => b.rank - a.rank)
    .slice(0, limit)
}

export const applicationRoutes: FastifyPluginAsyncZod = async (app) => {
  const auth = { preHandler: app.authenticate }
  const sec = { tags: ['postulaciones'], security: [{ session: [] }] }

  const loadCandidate = async (id: string) => {
    const c = await app.db.candidate.findUnique({ where: { id } })
    if (!c) throw notFound()
    return c
  }

  app.post('/applications', { ...auth, schema: { ...sec, body: z.object({ jobId: uuid }) } }, async (req, reply) => {
    const candidateId = candidateIdOf(req)
    const [c, job] = await Promise.all([
      loadCandidate(candidateId),
      app.db.job.findFirst({ where: { id: req.body.jobId, isActive: true } }),
    ])
    if (!job) throw notFound('Esta oferta ya no está disponible.')

    const existing = await app.db.application.findUnique({
      where: { candidateId_jobId: { candidateId, jobId: job.id } },
      include: { job: true },
    })
    if (existing && existing.status !== 'withdrawn') {
      throw conflict('ALREADY_APPLIED', 'Ya postulaste a esta oferta. Mira el estado en "Mis postulaciones".')
    }

    // No se impide postular aunque el match sea bajo: "Es una sugerencia, no un límite".
    const matchScore = scoreJob(matchCandidateOf(c), job).score
    try {
      const a = existing
        ? await app.db.application.update({
            where: { id: existing.id },
            data: {
              status: 'sent',
              matchScore,
              interviewAt: null,
              interviewMode: null,
              interviewPlace: null,
              interviewConfirmedAt: null,
              events: { create: { status: 'sent' } },
            },
            include: { job: true },
          })
        : await app.db.application.create({
            data: { candidateId, jobId: job.id, matchScore, events: { create: { status: 'sent' } } },
            include: { job: true },
          })
      return reply.status(201).send(applicationDto(a, c))
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw conflict('ALREADY_APPLIED', 'Ya postulaste a esta oferta.')
      }
      throw e
    }
  })

  app.get('/applications', { ...auth, schema: sec }, async (req) => {
    const c = await loadCandidate(candidateIdOf(req))
    const items = await app.db.application.findMany({
      where: { candidateId: c.id },
      include: { job: true },
      orderBy: { updatedAt: 'desc' },
    })
    const notSelected = items.filter((a) => a.status === 'notSelected')
    let similarCount = new Map<string, number>()
    if (notSelected.length) {
      const jobs = await app.db.job.findMany({ where: { isActive: true } })
      const applied = new Set(items.map((a) => a.jobId))
      const mc = matchCandidateOf(c)
      similarCount = new Map(notSelected.map((a) => [a.id, similarJobs(mc, a.job, jobs, applied).length]))
    }
    return {
      items: items.map((a) =>
        applicationDto(a, c, similarCount.has(a.id) ? { similarCount: similarCount.get(a.id)! } : undefined),
      ),
    }
  })

  app.get('/applications/:id', { ...auth, schema: { ...sec, params: idParam } }, async (req) => {
    const c = await loadCandidate(candidateIdOf(req))
    const a = await app.db.application.findFirst({
      where: { id: req.params.id, candidateId: c.id },
      include: { job: true, events: { orderBy: { createdAt: 'asc' } } },
    })
    if (!a) throw notFound('No encontramos esta postulación.')
    return applicationDto(a, c)
  })

  app.post('/applications/:id/confirm-interview', { ...auth, schema: { ...sec, params: idParam } }, async (req) => {
    const c = await loadCandidate(candidateIdOf(req))
    const a = await app.db.application.findFirst({ where: { id: req.params.id, candidateId: c.id } })
    if (!a) throw notFound('No encontramos esta postulación.')
    if (a.status !== 'interview' || !a.interviewAt) {
      throw unprocessable('NO_INTERVIEW', 'Esta postulación todavía no tiene una entrevista para confirmar.')
    }
    if (a.interviewAt < new Date()) throw unprocessable('INTERVIEW_PAST', 'La fecha de esta entrevista ya pasó.')
    const u = await app.db.application.update({
      where: { id: a.id },
      data: {
        interviewConfirmedAt: a.interviewConfirmedAt ?? new Date(),
        ...(!a.interviewConfirmedAt && { events: { create: { status: 'interview', note: 'Asistencia confirmada' } } }),
      },
      include: { job: true, events: { orderBy: { createdAt: 'asc' } } },
    })
    return applicationDto(u, c)
  })

  app.get('/applications/:id/similar', { ...auth, schema: { ...sec, params: idParam } }, async (req) => {
    const c = await loadCandidate(candidateIdOf(req))
    const a = await app.db.application.findFirst({ where: { id: req.params.id, candidateId: c.id }, include: { job: true } })
    if (!a) throw notFound('No encontramos esta postulación.')
    const [jobs, mine] = await Promise.all([
      app.db.job.findMany({ where: { isActive: true } }),
      app.db.application.findMany({ where: { candidateId: c.id }, select: { jobId: true } }),
    ])
    const items = similarJobs(matchCandidateOf(c), a.job, jobs, new Set(mine.map((x) => x.jobId)))
    return { items: items.map((x) => ({ job: jobDto(x.job), match: x.match })) }
  })

  app.post('/applications/:id/withdraw', { ...auth, schema: { ...sec, params: idParam } }, async (req) => {
    const c = await loadCandidate(candidateIdOf(req))
    const a = await app.db.application.findFirst({ where: { id: req.params.id, candidateId: c.id } })
    if (!a) throw notFound('No encontramos esta postulación.')
    const u = await app.db.application.update({
      where: { id: a.id },
      data: { status: 'withdrawn', events: { create: { status: 'withdrawn' } } },
      include: { job: true, events: { orderBy: { createdAt: 'asc' } } },
    })
    return applicationDto(u, c)
  })
}
