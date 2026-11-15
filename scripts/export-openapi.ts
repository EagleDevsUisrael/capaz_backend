/** Escribe openapi.json con el contrato de la API (npm run openapi). No necesita base de datos. */
import { writeFileSync } from 'node:fs'
import { buildApp } from '../src/app.ts'
import { env } from '../src/config/env.ts'
import { createPrisma } from '../src/lib/prisma.ts'

const app = await buildApp({ db: createPrisma(), config: env, logger: false })
await app.ready()
writeFileSync(new URL('../openapi.json', import.meta.url), JSON.stringify(app.swagger(), null, 2) + '\n')
await app.close()
console.log('openapi.json generado')
