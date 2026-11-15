import type { FastifyInstance } from 'fastify'

/**
 * Borra lo que ya no debe existir: escaneos de carnet sin confirmar, traspasos vencidos,
 * códigos de ingreso y verificaciones de celular viejos , sesiones vencidas y hojas de vida subidas que nadie vinculó. Corre al arrancar y cada 15 minutos.
 */
export async function cleanupExpired(app: FastifyInstance) {
  const now = new Date()
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  const [scans, handoffs, codes, phones, sessions, cvs] = await app.db.$transaction([
    app.db.idCardScan.deleteMany({ where: { status: 'pending', expiresAt: { lt: now } } }),
    app.db.idCardHandoff.deleteMany({ where: { expiresAt: { lt: now } } }),
    app.db.loginCode.deleteMany({ where: { createdAt: { lt: dayAgo } } }),
    app.db.phoneVerification.deleteMany({ where: { createdAt: { lt: dayAgo } } }),
    app.db.session.deleteMany({ where: { OR: [{ expiresAt: { lt: now } }, { revokedAt: { lt: dayAgo } }] } }),
    app.db.cvFile.deleteMany({ where: { candidateId: null, expiresAt: { lt: now } } }),
  ])
  const total = scans.count + handoffs.count + codes.count + phones.count + sessions.count + cvs.count
  if (total) app.log.info({ scans: scans.count, handoffs: handoffs.count, codes: codes.count, phones: phones.count, sessions: sessions.count, cvs: cvs.count }, 'limpieza')
}

export function scheduleCleanup(app: FastifyInstance, everyMs = 15 * 60 * 1000) {
  const run = () => cleanupExpired(app).catch((err) => app.log.error(err, 'falló la limpieza'))
  void run()
  const timer = setInterval(run, everyMs)
  timer.unref()
  app.addHook('onClose', async () => clearInterval(timer))
}
