/**
 * Admin de demostración (/admin/jobs del front). Todas las rutas piden `Authorization: Bearer <ADMIN_TOKEN>`.
 *
 * Ofertas:        GET/POST /api/admin/jobs · GET/PUT/DELETE /api/admin/jobs/:id · POST /api/admin/jobs/random
 * Probar match:   POST /api/admin/match                      (no guarda nada)
 * Candidatos:     GET /api/admin/candidates · POST /api/admin/candidates/random · GET /api/admin/candidates/:id/matches
 *                 (solo candidatos de prueba: el admin nunca ve personas reales)
 * Postulaciones:  GET /api/admin/applications · PATCH /api/admin/applications/:id   (para mover estados en la demo)
 */
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { rankJobs } from '../domain/matchEngine.js'
import { notFound } from '../lib/errors.js'
import { randomCandidates, randomJobs } from '../seed/demoData.js'
import { applicationDto, jobDto, matchCandidateOf } from './dto.js'
import { accommodations, disabilityType, educationLevel, idParam, interviewMode, jobInput, skills, toJobData, uuid } from './schemas.js'

const matchCandidate = z.object({
  disabilityType,
  disabilityPercent: z.number().int().min(1).max(100),
  city: z.string().max(80).nullable().default(null),
  experienceText: z.string().max(4000).default(''),
  education: educationLevel.nullable().default(null),
  skills: skills.default([]),
  accommodationsNeeded: accommodations.default([]),
  otherAccommodation: z.string().max(500).default(''),
})

export const adminRoutes: FastifyPluginAsyncZod = async (app) => {
  app.addHook('preHandler', app.requireAdmin)
  const tags = ['admin']
  const security = [{ admin: [] }]

  // ── Ofertas ──
  app.get('/jobs', { schema: { tags, security } }, async () => {
    const jobs = await app.db.job.findMany({ orderBy: { createdAt: 'desc' } })
    return { items: jobs.map((j) => ({ ...jobDto(j), isDemo: j.isDemo })) }
  })

  app.get('/jobs/:id', { schema: { tags, security, params: idParam } }, async (req) => {
    const j = await app.db.job.findUnique({ where: { id: req.params.id } })
    if (!j) throw notFound()
    return jobDto(j)
  })

  app.post('/jobs', { schema: { tags, security, body: jobInput } }, async (req, reply) => {
    const j = await app.db.job.create({ data: toJobData(req.body) })
    return reply.status(201).send(jobDto(j))
  })

  app.put('/jobs/:id', { schema: { tags, security, params: idParam, body: jobInput } }, async (req) => {
    const exists = await app.db.job.findUnique({ where: { id: req.params.id }, select: { id: true } })
    if (!exists) throw notFound()
    return jobDto(await app.db.job.update({ where: { id: req.params.id }, data: toJobData(req.body) }))
  })

  app.delete('/jobs/:id', { schema: { tags, security, params: idParam } }, async (req, reply) => {
    const { count } = await app.db.job.deleteMany({ where: { id: req.params.id } })
    if (!count) throw notFound()
    return reply.status(204).send()
  })

  app.post(
    '/jobs/random',
    { schema: { tags, security, body: z.object({ count: z.number().int().min(1).max(50).default(10) }).default({ count: 10 }) } },
    async (req, reply) => {
      const data = randomJobs(req.body.count).map((j) => ({ ...toJobData(j), isDemo: true }))
      const created = await app.db.job.createManyAndReturn({ data })
      return reply.status(201).send({ items: created.map(jobDto) })
    },
  )

  // ── Probar match rápido ──
  app.post(
    '/match',
    {
      schema: {
        tags,
        security,
        body: z.object({ candidate: matchCandidate, jobIds: z.array(uuid).max(200).optional() }),
      },
    },
    async (req) => {
      const jobs = await app.db.job.findMany({
        where: req.body.jobIds ? { id: { in: req.body.jobIds } } : { isActive: true },
      })
      const byId = new Map(jobs.map((j) => [j.id, j]))
      return {
        items: rankJobs(req.body.candidate, jobs).map((m) => ({
          job: { id: m.jobId, title: byId.get(m.jobId)!.title, company: byId.get(m.jobId)!.company },
          match: m,
        })),
      }
    },
  )

  // ── Candidatos de prueba ──
  app.get('/candidates', { schema: { tags, security } }, async () => {
    const items = await app.db.candidate.findMany({ where: { isTest: true }, orderBy: { createdAt: 'desc' } })
    return {
      items: items.map((c) => ({
        id: c.id,
        fullName: c.fullName,
        ...matchCandidateOf(c),
      })),
    }
  })

  app.post(
    '/candidates/random',
    { schema: { tags, security, body: z.object({ count: z.number().int().min(1).max(50).default(5) }).default({ count: 5 }) } },
    async (req, reply) => {
      const created = await app.db.candidate.createManyAndReturn({
        data: randomCandidates(req.body.count),
        skipDuplicates: true,
      })
      return reply.status(201).send({ count: created.length })
    },
  )

  app.get('/candidates/:id/matches', { schema: { tags, security, params: idParam } }, async (req) => {
    const c = await app.db.candidate.findFirst({ where: { id: req.params.id, isTest: true } })
    if (!c) throw notFound()
    const jobs = await app.db.job.findMany({ where: { isActive: true } })
    const byId = new Map(jobs.map((j) => [j.id, j]))
    return {
      items: rankJobs(matchCandidateOf(c), jobs).map((m) => ({
        job: { id: m.jobId, title: byId.get(m.jobId)!.title, company: byId.get(m.jobId)!.company },
        match: m,
      })),
    }
  })

  // ── Postulaciones (para la demo del progreso en "Mis postulaciones") ──
  app.get('/applications', { schema: { tags, security } }, async () => {
    const items = await app.db.application.findMany({ include: { job: true }, orderBy: { updatedAt: 'desc' }, take: 200 })
    // Sin datos de la persona: el admin solo mueve estados
    return { items: items.map((a) => applicationDto(a)) }
  })

  app.patch(
    '/applications/:id',
    {
      schema: {
        tags,
        security,
        params: idParam,
        body: z.object({
          status: z.enum(['sent', 'inReview', 'interview', 'hired', 'notSelected']),
          interviewAt: z.iso.datetime({ offset: true }).nullable().optional(),
          interviewMode: interviewMode.nullable().optional(),
          interviewPlace: z.string().max(200).nullable().optional(),
          note: z.string().max(500).optional(),
        }),
      },
    },
    async (req) => {
      const a = await app.db.application.findUnique({ where: { id: req.params.id }, select: { id: true } })
      if (!a) throw notFound()
      const { status, interviewAt, interviewMode: mode, interviewPlace, note } = req.body
      const u = await app.db.application.update({
        where: { id: a.id },
        data: {
          status,
          // Una fecha nueva pide confirmar otra vez
          ...(interviewAt !== undefined && {
            interviewAt: interviewAt ? new Date(interviewAt) : null,
            interviewConfirmedAt: null,
          }),
          ...(mode !== undefined && { interviewMode: mode }),
          ...(interviewPlace !== undefined && { interviewPlace }),
          events: { create: { status, note: note ?? null } },
        },
        include: { job: true, events: { orderBy: { createdAt: 'asc' } } },
      })
      return applicationDto(u)
    },
  )
}
