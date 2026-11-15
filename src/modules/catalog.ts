import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { CATALOG } from '../domain/catalog.js'
import { RECOMMEND_THRESHOLD } from '../domain/matchEngine.js'

/** GET /api/catalog: listas de códigos y etiquetas (habilidades, ajustes, exigencias, etc.). */
export const catalogRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get('/catalog', { schema: { tags: ['catálogo'] } }, async (_req, reply) => {
    reply.header('Cache-Control', 'public, max-age=3600')
    return { ...CATALOG, recommendThreshold: RECOMMEND_THRESHOLD }
  })
}
