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

  it('0002 se aplica sobre una base con datos de la 0001 (fotos guardadas y su consentimiento)', async () => {
    const db = new PGlite()
    await db.exec(readFileSync(new URL('0001_init.sql', dir), 'utf8'))
    await db.exec(`
      INSERT INTO candidates (id, id_number, full_name, disability_type, disability_percent, phone, phone_verified_at, email, city, consent_at)
      VALUES ('00000000-0000-0000-0000-000000000001', '1710034065', 'Prueba', 'physical', 50, '0991234567', now(), 'p@e.ec', 'Quito', now());
      INSERT INTO consent_records (candidate_id, purpose, granted, policy_version)
      VALUES ('00000000-0000-0000-0000-000000000001', 'keepIdCardImages', true, 'v1'),
             ('00000000-0000-0000-0000-000000000001', 'useProfile', true, 'v1');
      INSERT INTO id_card_scans (candidate_id, status, front_image, front_mime, back_image, back_mime, extracted, confidence, ocr_provider, expires_at)
      VALUES ('00000000-0000-0000-0000-000000000001', 'confirmed', '\\x01', 'image/jpeg', '\\x02', 'image/jpeg', '{}', '{}', 'mock', now());
      INSERT INTO jobs (title, company, city, modality, schedule, compatible_disabilities, tasks, easy_read_summary)
      VALUES ('Oferta', 'Empresa', 'Quito', 'remote', 'fullTime', '{physical}', '{tarea}', 'texto');
    `)
    await db.exec(readFileSync(new URL('0002_ajustes_mockups.sql', dir), 'utf8'))
    const consents = (await db.query<{ purpose: string }>('SELECT purpose FROM consent_records')).rows
    expect(consents.map((c) => c.purpose)).toEqual(['useProfile'])
    const scan = (await db.query<{ front_image: unknown }>('SELECT front_image FROM id_card_scans')).rows[0]
    expect(scan?.front_image).toBeNull()
    const cols = (await db.query<{ column_name: string }>(
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'jobs'",
    )).rows.map((r) => r.column_name)
    expect(cols).not.toContain('tasks')
    expect(cols).not.toContain('easy_read_summary')
    expect(cols).toContain('easy_read')
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
