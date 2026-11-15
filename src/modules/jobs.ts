import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { scoreJob } from '../domain/matchEngine.js'
import type { Prisma } from '../generated/prisma/client.js'
import { notFound } from '../lib/errors.js'
import { jobDto, matchCandidateOf } from './dto.js'
import { accommodation, csv, disabilityType, idParam, jobModality, jobSchedule } from './schemas.js'

const listQuery = z.object({
  /** "Qué": cargo, empresa, descripción o palabra clave */
  q: z.string().trim().max(100).optional(),
  /** "Dónde": ciudad */
  where: z.string().trim().max(80).optional(),
  /** Accesible para este tipo de discapacidad */
  accessibleFor: disabilityType.optional(),
  /** Ofrece TODOS estos ajustes (lista separada por comas) */
  accommodations: csv(accommodation).optional(),
  modality: csv(jobModality).optional(),
  schedule: csv(jobSchedule).optional(),
  /** Salario mínimo deseado: ofertas que pagan al menos esto */
  salaryMin: z.coerce.number().int().nonnegative().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
})

export function jobFilter(q: z.output<typeof listQuery>): Prisma.JobWhereInput {
  const and: Prisma.JobWhereInput[] = [{ isActive: true }]
  if (q.q) {
    const words = q.q.toLowerCase().split(/\s+/).filter(Boolean)
    and.push({
      OR: [
        { title: { contains: q.q, mode: 'insensitive' } },
        { company: { contains: q.q, mode: 'insensitive' } },
        { description: { contains: q.q, mode: 'insensitive' } },
        { keywords: { hasSome: words } },
      ],
    })
  }
  if (q.where) {
    and.push({ OR: [{ city: { contains: q.where, mode: 'insensitive' } }, { modality: 'remote' }] })
  }
  if (q.accessibleFor) and.push({ compatibleDisabilities: { has: q.accessibleFor } })
  if (q.accommodations?.length) and.push({ accommodationsOffered: { hasEvery: q.accommodations } })
  if (q.modality?.length) and.push({ modality: { in: q.modality } })
  if (q.schedule?.length) and.push({ schedule: { in: q.schedule } })
  if (q.salaryMin != null) {
    and.push({ OR: [{ salaryMax: { gte: q.salaryMin } }, { salaryMax: null, salaryMin: { gte: q.salaryMin } }] })
  }
  return { AND: and }
}

export const jobRoutes: FastifyPluginAsyncZod = async (app) => {
  /**
   * Lista pública de ofertas con filtros. `total` sirve para el botón "Ver N ofertas" del filtro.
   * "Dónde" incluye siempre las ofertas de teletrabajo.
   */
  app.get(
    '/jobs',
    { schema: { tags: ['ofertas'], querystring: listQuery } },
    async (req) => {
      const where = jobFilter(req.query)
      const [total, jobs] = await app.db.$transaction([
        app.db.job.count({ where }),
        app.db.job.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip: (req.query.page - 1) * req.query.pageSize,
          take: req.query.pageSize,
        }),
      ])
      return { total, page: req.query.page, pageSize: req.query.pageSize, items: jobs.map(jobDto) }
    },
  )

  /** Detalle. Con sesión, incluye el match con la persona ("Por qué encaja contigo"). */
  app.get(
    '/jobs/:id',
    {
      schema: { tags: ['ofertas'], params: idParam, security: [{}, { session: [] }] },
      preHandler: app.optionalAuth,
    },
    async (req) => {
      const job = await app.db.job.findFirst({ where: { id: req.params.id, isActive: true } })
      if (!job) throw notFound('Esta oferta ya no está disponible.')
      let match = null
      let applicationId: string | null = null
      if (req.candidateId) {
        const c = await app.db.candidate.findUnique({ where: { id: req.candidateId } })
        if (c) match = scoreJob(matchCandidateOf(c), job)
        const app_ = await app.db.application.findUnique({
          where: { candidateId_jobId: { candidateId: req.candidateId, jobId: job.id } },
          select: { id: true },
        })
        applicationId = app_?.id ?? null
      }
      return { job: jobDto(job), match, applicationId }
    },
  )
}
