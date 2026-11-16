/**
 * Ejecuta un archivo .sql contra la base (DIRECT_URL). Pensado para seeds como database/seed/ofertas_demo.sql.
 *
 *   npm run db:seed-sql -- database/seed/ofertas_demo.sql
 *
 * El archivo debe traer su propio BEGIN/COMMIT. Nunca imprime la cadena de conexión.
 */
import 'dotenv/config'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import pg from 'pg'

const file = process.argv[2]
if (!file) {
  console.error('Uso: npm run db:seed-sql -- <ruta/al/archivo.sql>')
  process.exit(1)
}
const raw = process.env.DIRECT_URL
if (!raw) {
  console.error('Falta DIRECT_URL en .env (conexión directa o session pooler, puerto 5432).')
  process.exit(1)
}

// Quita parámetros que pg no entiende o que chocan con la opción ssl de abajo.
const u = new URL(raw)
for (const p of ['pgbouncer', 'sslmode', 'connection_limit']) u.searchParams.delete(p)
const isLocal = ['localhost', '127.0.0.1'].includes(u.hostname)

const sql = readFileSync(resolve(file), 'utf8')
const client = new pg.Client({
  connectionString: u.toString(),
  ssl: isLocal ? undefined : { rejectUnauthorized: false },
})
await client.connect()
try {
  await client.query(sql)
  const { rows } = await client.query<{ n: number }>('SELECT count(*)::int AS n FROM jobs WHERE is_demo = true')
  console.log(`Ejecutado ${file}. Ofertas demo en la base: ${rows[0]?.n}`)
} catch (err) {
  console.error('Falló el SQL (se hizo ROLLBACK si iba en transacción):', (err as Error).message)
  await client.query('ROLLBACK').catch(() => {})
  process.exitCode = 1
} finally {
  await client.end()
}
