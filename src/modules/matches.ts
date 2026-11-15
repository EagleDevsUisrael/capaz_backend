import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { ACCOMMODATIONS, labelOf, SKILLS } from '../domain/catalog.js'
import { RECOMMEND_THRESHOLD, rankJobs, scoreJob } from '../domain/matchEngine.js'
import { notFound } from '../lib/errors.js'
import { candidateIdOf } from '../plugins/auth.js'
import { jobDto, matchCandidateOf } from './dto.js'

/**
 * GET /api/matches (pantalla "Resultados IA", /for-you)
 *
 *  - firstApplication: la oferta a la que la persona postuló primero ("La oferta a la que postulaste"), con su match
 *  - recommended: 70 o más, de mayor a menor (sin la de firstApplication)
 *  - others: compatibles con menos de 70 ("Ver todas las ofertas")
 *  - rejected: descartadas en la etapa 1, con el motivo
 *  - counts: "encontramos N trabajos que encajan contigo", "Hay N recomendaciones más y M ofertas en total"
 *  - consideredFactors: "Tomamos en cuenta: Trabajo sentado, Atención al cliente, Guayaquil o remoto…"
 */
export const matchRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get(
    '/matches',
    { schema: { tags: ['match'], security: [{ session: [] }] }, preHandler: app.authenticate },
    async (req) => {
      const c = await app.db.candidate.findUnique({ where: { id: candidateIdOf(req) } })
      if (!c) throw notFound()
      const [jobs, applications] = await Promise.all([
        app.db.job.findMany({ where: { isActive: true } }),
        app.db.application.findMany({
          where: { candidateId: c.id },
          orderBy: { createdAt: 'asc' },
          include: { job: true },
        }),
      ])
      const mc = matchCandidateOf(c)
      const appliedBy = new Map(applications.map((a) => [a.jobId, a.id]))
      const byId = new Map(jobs.map((j) => [j.id, j]))

      const first = applications.find((a) => a.status !== 'withdrawn') ?? null
      const firstApplication = first
        ? {
            applicationId: first.id,
            status: first.status,
            job: jobDto(first.job),
            match: scoreJob(mc, first.job),
          }
        : null

      const ranked = rankJobs(mc, jobs)
        .filter((m) => m.jobId !== first?.jobId)
        .map((m) => ({ job: jobDto(byId.get(m.jobId)!), match: m, applicationId: appliedBy.get(m.jobId) ?? null }))
      const recommended = ranked.filter((r) => r.match.recommended)

      const profileComplete =
        c.hasWorked !== null ||
        c.experienceText.trim() !== '' ||
        c.education !== null ||
        c.skills.length > 0 ||
        c.accommodationsNeeded.length > 0

      return {
        threshold: RECOMMEND_THRESHOLD,
        /** "Perfil completo": la persona llenó el paso 3 (experiencia y ajustes) */
        profileComplete,
        /** true si la persona no marcó ajustes: el front muestra el aviso para completarlos */
        missingAccommodations: c.accommodationsNeeded.length === 0,
        consideredFactors: [
          ...c.accommodationsNeeded.map((a) => labelOf(ACCOMMODATIONS, a)),
          ...c.skills.map((s) => labelOf(SKILLS, s)),
          `${c.city} o remoto`,
        ],
        counts: {
          /** Trabajos que encajan (70 o más), contando la primera postulación si encaja */
          matching: recommended.length + (firstApplication?.match.recommended ? 1 : 0),
          recommended: recommended.length,
          totalJobs: jobs.length,
        },
        firstApplication,
        recommended,
        others: ranked.filter((r) => !r.match.recommended && !r.match.rejected),
        rejected: ranked.filter((r) => r.match.rejected),
      }
    },
  )
}
