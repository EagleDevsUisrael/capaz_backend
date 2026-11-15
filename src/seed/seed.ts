/**
 * Carga las ofertas de ejemplo (npm run db:seed). Si ya hay ofertas, no hace nada
 * salvo que se pase --force (borra las ofertas de demostración y vuelve a cargarlas).
 */
import { createPrisma } from '../lib/prisma.js'
import { SEED_JOBS } from './demoData.js'

const db = createPrisma()
const force = process.argv.includes('--force')

try {
  const count = await db.job.count()
  if (count > 0 && !force) {
    console.log(`Ya hay ${count} ofertas; no se cargó nada. Usa --force para recargar las de demostración.`)
  } else {
    if (force) await db.job.deleteMany({ where: { isDemo: true } })
    await db.job.createMany({ data: SEED_JOBS.map((j) => ({ ...j, isDemo: true })) })
    console.log(`Se cargaron ${SEED_JOBS.length} ofertas de ejemplo.`)
  }
} finally {
  await db.$disconnect()
}
