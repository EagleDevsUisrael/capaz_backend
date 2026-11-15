import { buildApp } from './app.js'
import { env } from './config/env.js'
import { scheduleCleanup } from './jobs/cleanup.js'
import { createPrisma } from './lib/prisma.js'

const db = createPrisma()
const app = await buildApp({
  db,
  config: env,
  logger:
    env.NODE_ENV === 'development'
      ? { level: 'info', transport: { target: 'pino-pretty', options: { translateTime: 'HH:MM:ss', ignore: 'pid,hostname' } } }
      : { level: 'info', redact: ['req.headers.authorization'] },
})

app.addHook('onClose', async () => db.$disconnect())
scheduleCleanup(app)

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => {
    app.log.info(`${signal}: cerrando`)
    void app.close().then(() => process.exit(0))
  })
}

try {
  await app.listen({ port: env.PORT, host: env.HOST })
  if (env.NODE_ENV !== 'production') app.log.info(`Documentación de la API: http://localhost:${env.PORT}/docs`)
} catch (err) {
  app.log.error(err)
  process.exit(1)
}
