/**
 * Ofertas públicas (pantallas Inicio, Filtros y Detalle).
 *
 * GET /api/jobs        búsqueda + filtros + conteo por filtro (facets) + orden ("más compatibles" con sesión)
 * GET /api/jobs/:id    detalle (con sesión: match y si ya postuló)
 * GET /api/stats       "N ofertas inclusivas activas" y "N provincias"
 */
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import {
  JOB_FEATURES,
  JOB_SCHEDULE_CODES,
  SALARY_RANGES,
  type JobFeature,
  type SalaryRange,
} from '../domain/catalog.js'
import { scoreJob, type Match } from '../domain/matchEngine.js'
import type { Prisma } from '../generated/prisma/client.js'
import { notFound } from '../lib/errors.js'
import { jobDto, matchCandidateOf } from './dto.js'
import {
  accommodation,
  csv,
  disabilityType,
  idParam,
  jobFeature,
  jobModality,
  jobSchedule,
  salaryRange,
} from './schemas.js'

/** Palabras que en "¿Dónde?" significan "solo teletrabajo" */
const REMOTE_WORDS = ['teletrabajo', 'remoto', 'desde casa', 'desde mi casa', 'en casa', 'todo el pais']
const fold = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim()

const listQuery = z.object({
  /** "¿Qué trabajo buscas?": cargo, empresa, descripción o palabra clave */
  q: z.string().trim().max(100).optional(),
  /** "¿Dónde?": ciudad o "teletrabajo". Una ciudad incluye también las ofertas de teletrabajo. */
  where: z.string().trim().max(80).optional(),
  /** Filtros "Accesibilidad del puesto" (la oferta debe cumplir todos): remote, wheelchair, screenReader, signLanguage, flexibleSchedule */
  features: csv(jobFeature).optional(),
  /** "Salario mensual": 470-600, 600-900 o 900+ */
  salary: salaryRange.optional(),
  /** "Jornada": fullTime, partTime, internship (cualquiera de las elegidas) */
  schedule: csv(jobSchedule).optional(),
  /** Avanzados: accesible para un tipo de discapacidad, ajustes exactos, modalidad, salario mínimo */
  accessibleFor: disabilityType.optional(),
  accommodations: csv(accommodation).optional(),
  modality: csv(jobModality).optional(),
  salaryMin: z.coerce.number().int().nonnegative().optional(),
  /** "Ordenar: más compatibles" necesita sesión; sin sesión se ordena por las más recientes */
  sort: z.enum(['compatibility', 'recent']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
})
type ListQuery = z.output<typeof listQuery>

function featureWhere(f: JobFeature): Prisma.JobWhereInput {
  const def = JOB_FEATURES.find((x) => x.value === f)!
  return 'accommodation' in def ? { accommodationsOffered: { has: def.accommodation } } : { modality: 'remote' }
}

/** El rango de la oferta (salaryMin–salaryMax) se cruza con el rango elegido. */
function salaryWhere(r: SalaryRange): Prisma.JobWhereInput {
  const { min, max } = SALARY_RANGES.find((x) => x.value === r)!
  const top: Prisma.JobWhereInput =
    max === null
      ? { OR: [{ salaryMax: { gt: min } }, { salaryMax: null, salaryMin: { gt: min } }] }
      : { OR: [{ salaryMax: { gte: min } }, { salaryMax: null, salaryMin: { gte: min } }] }
  return max === null ? top : { AND: [top, { salaryMin: { lte: max } }] }
}

export function jobFilter(q: ListQuery): Prisma.JobWhereInput {
  const and: Prisma.JobWhereInput[] = [{ isActive: true }]
  if (q.q) {
    const words = fold(q.q).split(/\s+/).filter(Boolean)
    and.push({
      OR: [
        { title: { contains: q.q, mode: 'insensitive' } },
        { company: { contains: q.q, mode: 'insensitive' } },
        { summary: { contains: q.q, mode: 'insensitive' } },
        { description: { contains: q.q, mode: 'insensitive' } },
        { keywords: { hasSome: words } },
      ],
    })
  }
  if (q.where) {
    if (REMOTE_WORDS.includes(fold(q.where))) and.push({ modality: 'remote' })
    else and.push({ OR: [{ city: { contains: q.where, mode: 'insensitive' } }, { modality: 'remote' }] })
  }
  for (const f of q.features ?? []) and.push(featureWhere(f))
  if (q.salary) and.push(salaryWhere(q.salary))
  if (q.schedule?.length) and.push({ schedule: { in: q.schedule } })
  if (q.accessibleFor) and.push({ compatibleDisabilities: { has: q.accessibleFor } })
  if (q.accommodations?.length) and.push({ accommodationsOffered: { hasEvery: q.accommodations } })
  if (q.modality?.length) and.push({ modality: { in: q.modality } })
  if (q.salaryMin != null) {
    and.push({ OR: [{ salaryMax: { gte: q.salaryMin } }, { salaryMax: null, salaryMin: { gte: q.salaryMin } }] })
  }
  return { AND: and }
}

/** Máximo de ofertas que se puntúan en memoria para ordenar por compatibilidad */
const MAX_SCORED = 2000

export const jobRoutes: FastifyPluginAsyncZod = async (app) => {
  /**
   * Lista con filtros. `total` es para "N ofertas encontradas" y "Ver N ofertas".
   * `facets` dice cuántas ofertas habría al marcar cada filtro, sumado a lo que ya está elegido.
   * Con sesión, cada oferta trae `match` y se puede ordenar por compatibilidad (por defecto).
   */
  app.get(
    '/jobs',
    {
      schema: { tags: ['ofertas'], querystring: listQuery, security: [{}, { session: [] }] },
      preHandler: app.optionalAuth,
    },
    async (req) => {
      const q = req.query
      const where = jobFilter(q)
      const candidate = req.candidateId ? await app.db.candidate.findUnique({ where: { id: req.candidateId } }) : null
      const sort = candidate ? (q.sort ?? 'compatibility') : 'recent'

      // ── Conteos por filtro ──
      const selected = q.features ?? []
      const featureCounts = JOB_FEATURES.map((f) =>
        app.db.job.count({ where: jobFilter({ ...q, features: [...new Set([...selected, f.value])] }) }),
      )
      const salaryCounts = SALARY_RANGES.map((r) => app.db.job.count({ where: jobFilter({ ...q, salary: r.value }) }))
      const scheduleCounts = JOB_SCHEDULE_CODES.map((s) => app.db.job.count({ where: jobFilter({ ...q, schedule: [s] }) }))
      const [total, ...counts] = await app.db.$transaction([
        app.db.job.count({ where }),
        ...featureCounts,
        ...salaryCounts,
        ...scheduleCounts,
      ])
      const take = <T extends { value: string }>(list: readonly T[], offset: number) =>
        Object.fromEntries(list.map((x, i) => [x.value, counts[offset + i]!]))
      const facets = {
        features: take(JOB_FEATURES, 0),
        salary: take(SALARY_RANGES, JOB_FEATURES.length),
        schedule: take(
          JOB_SCHEDULE_CODES.map((value) => ({ value })),
          JOB_FEATURES.length + SALARY_RANGES.length,
        ),
      }

      // ── Página ──
      const skip = (q.page - 1) * q.pageSize
      let items: (ReturnType<typeof jobDto> & { match: Match | null })[]
      if (candidate && sort === 'compatibility') {
        const jobs = await app.db.job.findMany({ where, orderBy: { createdAt: 'desc' }, take: MAX_SCORED })
        const mc = matchCandidateOf(candidate)
        items = jobs
          .map((j) => ({ ...jobDto(j), match: scoreJob(mc, j) }))
          .sort((a, b) => b.match.score - a.match.score)
          .slice(skip, skip + q.pageSize)
      } else {
        const jobs = await app.db.job.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: q.pageSize })
        const mc = candidate ? matchCandidateOf(candidate) : null
        items = jobs.map((j) => ({ ...jobDto(j), match: mc ? scoreJob(mc, j) : null }))
      }

      return { total, page: q.page, pageSize: q.pageSize, sort, facets, items }
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
        const existing = await app.db.application.findUnique({
          where: { candidateId_jobId: { candidateId: req.candidateId, jobId: job.id } },
          select: { id: true },
        })
        applicationId = existing?.id ?? null
      }
      return { job: jobDto(job), match, applicationId }
    },
  )

  /** Inicio: "1.240 ofertas inclusivas activas" y "24 provincias". */
  app.get('/stats', { schema: { tags: ['ofertas'] } }, async (_req, reply) => {
    const [activeJobs, remoteJobs, provinces] = await app.db.$transaction([
      app.db.job.count({ where: { isActive: true } }),
      app.db.job.count({ where: { isActive: true, modality: 'remote' } }),
      app.db.job.findMany({
        where: { isActive: true, province: { not: null } },
        distinct: ['province'],
        select: { province: true },
      }),
    ])
    reply.header('Cache-Control', 'public, max-age=60')
    return { activeJobs, remoteJobs, provinces: provinces.length }
  })
}
