/**
 * Aplica en la base (DIRECT_URL) las migraciones de database/migrations/ que falten, en orden.
 *
 *   npm run db:migrate            aplica las pendientes
 *   npm run db:migrate -- status  solo muestra cuáles están aplicadas y cuáles faltan
 *
 * Es equivalente a pegarlas una por una en el SQL Editor de Supabase.
 */
import 'dotenv/config'
import pg from 'pg'
import { listMigrations, readMigration } from './lib.ts'

const statusOnly = process.argv[2] === 'status'
const url = process.env.DIRECT_URL
if (!url) {
  console.error('Falta DIRECT_URL en .env (conexión directa o session pooler, puerto 5432).')
  process.exit(1)
}

const client = new pg.Client({ connectionString: url })
await client.connect()
try {
  const { rows } = await client.query<{ exists: boolean }>(
    "SELECT to_regclass('public.schema_migrations') IS NOT NULL AS exists",
  )
  const applied = new Set<string>()
  if (rows[0]?.exists) {
    const r = await client.query<{ version: string }>('SELECT version FROM public.schema_migrations')
    for (const x of r.rows) applied.add(x.version)
  }

  const all = listMigrations()
  const pending = all.filter((m) => !applied.has(m.version))
  for (const m of all) console.log(`${applied.has(m.version) ? '✔ aplicada ' : '· pendiente'}  ${m.version}_${m.name}`)

  if (statusOnly || pending.length === 0) {
    if (pending.length === 0) console.log('La base está al día.')
  } else {
    for (const m of pending) {
      process.stdout.write(`Aplicando ${m.version}_${m.name}… `)
      await client.query(readMigration(m)) // cada archivo trae su propio BEGIN/COMMIT
      console.log('listo')
    }
    console.log(`Se aplicaron ${pending.length} migración(es).`)
  }
} catch (err) {
  console.error('\nFalló la migración (no se aplicó esa migración):', (err as Error).message)
  process.exitCode = 1
} finally {
  await client.end()
}
