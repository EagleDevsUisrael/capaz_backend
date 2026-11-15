import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { RECOMMEND_THRESHOLD, rankJobs } from '../domain/matchEngine.js'
import { notFound } from '../lib/errors.js'
import { candidateIdOf } from '../plugins/auth.js'
import { jobDto, matchCandidateOf } from './dto.js'

/**
 * GET /api/matches (pantalla /for-you): ofertas activas puntuadas para la persona.
 *  - recommended: 70 o más, de mayor a menor
 *  - others: compatibles con menos de 70 ("Ver todas las ofertas")
 *  - rejected: descartadas en la etapa 1, con el motivo
 */
export const matchRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get(
    '/matches',
    { schema: { tags: ['match'], security: [{ session: [] }] }, preHandler: app.authenticate },
    async (req) => {
      const c = await app.db.candidate.findUnique({ where: { id: candidateIdOf(req) } })
      if (!c) throw notFound()
      const jobs = await app.db.job.findMany({ where: { isActive: true } })
      const byId = new Map(jobs.map((j) => [j.id, j]))
      const ranked = rankJobs(matchCandidateOf(c), jobs).map((m) => ({ job: jobDto(byId.get(m.jobId)!), match: m }))
      return {
        threshold: RECOMMEND_THRESHOLD,
        /** true si la persona no marcó ajustes: el front muestra el aviso para completarlos */
        missingAccommodations: c.accommodationsNeeded.length === 0,
        recommended: ranked.filter((r) => r.match.recommended),
        others: ranked.filter((r) => !r.match.recommended && !r.match.rejected),
        rejected: ranked.filter((r) => r.match.rejected),
      }
    },
  )
}
