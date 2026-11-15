/** La cadena de migraciones y database/schema.sql deben dejar exactamente la misma base. */
import { PGlite } from '@electric-sql/pglite'
import { readdirSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { pgConnectionString } from './lib/prisma.js'

const dir = new URL('../database/migrations/', import.meta.url)
const migrations = readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()

async function describeDb(db: PGlite) {
  const q = async (sql: string) => (await db.query(sql)).rows
  return {
    columns: await q(`SELECT table_name, column_name, data_type, udt_name, is_nullable, column_default
                      FROM information_schema.columns WHERE table_schema = 'public' ORDER BY 1, 2`),
    constraints: await q(`SELECT conrelid::regclass::text AS t, conname, pg_get_constraintdef(oid) AS def
                          FROM pg_constraint WHERE connamespace = 'public'::regnamespace ORDER BY 1, 2`),
    indexes: await q(`SELECT indexname, indexdef FROM pg_indexes WHERE schemaname = 'public' ORDER BY 1`),
    enums: await q(`SELECT t.typname, e.enumlabel FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid ORDER BY 1, e.enumsortorder`),
    rls: await q(`SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' ORDER BY 1`),
    triggers: await q(`SELECT event_object_table, trigger_name FROM information_schema.triggers ORDER BY 1, 2`),
    migrations: await q(`SELECT version, name FROM schema_migrations ORDER BY 1`),
  }
}

describe('base de datos', () => {
  it('las migraciones en orden equivalen a schema.sql', async () => {
    const a = new PGlite()
    for (const f of migrations) await a.exec(readFileSync(new URL(f, dir), 'utf8'))
    const b = new PGlite()
    await b.exec(readFileSync(new URL('../database/schema.sql', import.meta.url), 'utf8'))
    const [da, db] = [await describeDb(a), await describeDb(b)]
    expect(da).toEqual(db)
    expect(da.rls.every((r) => (r as { rowsecurity: boolean }).rowsecurity)).toBe(true)
    expect(da.migrations).toHaveLength(migrations.length)
  })

  it('una migración no se aplica dos veces', async () => {
    const db = new PGlite()
    const first = readFileSync(new URL(migrations[0]!, dir), 'utf8')
    await db.exec(first)
    await expect(db.exec(first)).rejects.toThrow(/base vacía/)
  })

  it('quita ?pgbouncer=true y otros parámetros de Prisma antes de conectar con pg', () => {
    expect(pgConnectionString('postgresql://u:p@h.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1&sslmode=require')).toBe(
      'postgresql://u:p@h.pooler.supabase.com:6543/postgres?sslmode=require',
    )
  })
})
