/**
 * Generación del SQL de la base:
 *  - database/migrations/NNNN_nombre.sql → migraciones incrementales (se aplican en orden, una sola vez)
 *  - database/schema.sql                 → estado completo, para crear una base vacía de una vez
 *  - database/.snapshot/                 → cómo quedó el modelo en la última migración (para calcular la siguiente)
 *
 * Fuentes: prisma/schema.prisma (tablas, enums, índices, llaves) y src/domain/catalog.ts (CHECK de los arrays).
 */
import { execSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import {
  ACCOMMODATION_CODES,
  DISABILITY_TYPE_CODES,
  PHYSICAL_DEMAND_CODES,
  PROVINCE_CODES,
  SKILL_CODES,
} from '../../src/domain/catalog.ts'

export const ROOT = fileURLToPath(new URL('../../', import.meta.url))
export const path = (p: string) => fileURLToPath(new URL(`../../${p}`, import.meta.url))
export const MIGRATIONS_DIR = path('database/migrations')
export const SNAPSHOT_SCHEMA = path('database/.snapshot/schema.prisma')
export const SNAPSHOT_CATALOG = path('database/.snapshot/catalog.json')
export const SCHEMA_SQL = path('database/schema.sql')

/** SQL de Prisma entre dos estados del modelo. `from`/`to`: ruta de un .prisma o 'empty'. */
export function prismaDiff(from: string, to: string) {
  const arg = (side: 'from' | 'to', v: string) => (v === 'empty' ? `--${side}-empty` : `--${side}-schema "${v}"`)
  return execSync(`npx prisma migrate diff ${arg('from', from)} ${arg('to', to)} --script`, {
    cwd: ROOT,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'inherit'],
  })
    .replace(/^-- CreateSchema\nCREATE SCHEMA IF NOT EXISTS "public";\n\n/m, '')
    .replace(/\r\n/g, '\n')
    .trim()
}

// ─── CHECK de catálogo (dependen de src/domain/catalog.ts) ──────────────────

/** Columna array (text[]) o escalar (text, null permitido) con códigos permitidos. */
export type CatalogCheck = { codes: readonly string[]; scalar?: boolean }
/** "tabla.columna" → regla. (Los snapshots viejos guardan solo el array de códigos.) */
export type ArrayChecks = Record<string, CatalogCheck | readonly string[]>
const norm = (c: CatalogCheck | readonly string[] | undefined): CatalogCheck | undefined =>
  c === undefined ? undefined : Array.isArray(c) ? { codes: c } : (c as CatalogCheck)

export const currentArrayChecks = (): Record<string, CatalogCheck> => ({
  'candidates.skills': { codes: SKILL_CODES },
  'candidates.accommodations_needed': { codes: ACCOMMODATION_CODES },
  'jobs.compatible_disabilities': { codes: DISABILITY_TYPE_CODES },
  'jobs.physical_demands': { codes: PHYSICAL_DEMAND_CODES },
  'jobs.accommodations_offered': { codes: ACCOMMODATION_CODES },
  'jobs.province': { codes: PROVINCE_CODES, scalar: true },
})

export function addArrayCheck(key: string, check: CatalogCheck | readonly string[]) {
  const { codes, scalar } = norm(check)!
  const [table, column] = key.split('.')
  const arr = `ARRAY[${codes.map((c) => `'${c}'`).join(', ')}]::text[]`
  const cond = scalar ? `"${column}" IS NULL OR "${column}" = ANY (${arr})` : `"${column}" <@ ${arr}`
  return `ALTER TABLE "${table}" ADD CONSTRAINT "${table}_${column}_valid" CHECK (${cond});`
}

export function dropArrayCheck(key: string) {
  const [table, column] = key.split('.')
  return `ALTER TABLE "${table}" DROP CONSTRAINT IF EXISTS "${table}_${column}_valid";`
}

/** Cambios de catálogo entre dos estados → SQL que reemplaza los CHECK afectados. */
export function arrayCheckDiff(before: ArrayChecks, after: ArrayChecks) {
  const out: string[] = []
  for (const key of new Set([...Object.keys(before), ...Object.keys(after)])) {
    const a = norm(before[key])
    const b = norm(after[key])
    if (JSON.stringify(a) === JSON.stringify(b)) continue
    if (a) out.push(dropArrayCheck(key))
    if (b) out.push(addArrayCheck(key, b))
  }
  return out.join('\n')
}

// ─── Estado completo ────────────────────────────────────────────────────────

const SCHEMA_MIGRATIONS_TABLE = `-- Registro de migraciones aplicadas (lo usan las migraciones y npm run db:migrate)
CREATE TABLE "schema_migrations" (
    "version" VARCHAR(4) NOT NULL,
    "name" TEXT NOT NULL,
    "applied_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),

    CONSTRAINT "schema_migrations_pkey" PRIMARY KEY ("version")
);`

const STATIC_RULES = `ALTER TABLE "candidates" ADD CONSTRAINT "candidates_id_number_format" CHECK ("id_number" ~ '^[0-9]{10}$');
ALTER TABLE "candidates" ADD CONSTRAINT "candidates_phone_format" CHECK ("phone" ~ '^09[0-9]{8}$');
ALTER TABLE "candidates" ADD CONSTRAINT "candidates_disability_percent_range" CHECK ("disability_percent" BETWEEN 1 AND 100);
ALTER TABLE "phone_verifications" ADD CONSTRAINT "phone_verifications_phone_format" CHECK ("phone" ~ '^09[0-9]{8}$');
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_compatible_disabilities_not_empty" CHECK (cardinality("compatible_disabilities") > 0);
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_daily_hours_range" CHECK ("daily_hours" IS NULL OR "daily_hours" BETWEEN 1 AND 24);
ALTER TABLE "cv_files" ADD CONSTRAINT "cv_files_size_range" CHECK ("size_bytes" BETWEEN 1 AND 10485760);
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_salary_range" CHECK ("salary_min" IS NULL OR "salary_max" IS NULL OR "salary_min" <= "salary_max");
ALTER TABLE "applications" ADD CONSTRAINT "applications_match_score_range" CHECK ("match_score" BETWEEN 0 AND 100);

-- Búsqueda por arrays (filtros "accesible para" y "ajustes")
CREATE INDEX "jobs_compatible_disabilities_gin" ON "jobs" USING GIN ("compatible_disabilities");
CREATE INDEX "jobs_accommodations_offered_gin" ON "jobs" USING GIN ("accommodations_offered");
CREATE INDEX "jobs_keywords_gin" ON "jobs" USING GIN ("keywords");

-- updated_at también se actualiza si alguien edita desde el panel de Supabase
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
CREATE TRIGGER "candidates_set_updated_at" BEFORE UPDATE ON "candidates" FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER "jobs_set_updated_at" BEFORE UPDATE ON "jobs" FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER "applications_set_updated_at" BEFORE UPDATE ON "applications" FOR EACH ROW EXECUTE FUNCTION set_updated_at();`

/** Tablas creadas en un SQL (para activarles RLS). */
export const createdTables = (sql: string) => [...sql.matchAll(/^CREATE TABLE "([^"]+)"/gm)].map((m) => m[1]!)

export const RLS_NOTE = `-- Seguridad en Supabase: el esquema "public" se publica por la API REST con las claves anon/authenticated.
-- Hay datos sensibles (discapacidad, carnet), así que cada tabla lleva RLS SIN políticas: nadie entra por
-- esa API. El backend se conecta con el rol "postgres" (dueño de las tablas), que no está sujeto a RLS.`

export const enableRls = (tables: string[]) => tables.map((t) => `ALTER TABLE "${t}" ENABLE ROW LEVEL SECURITY;`).join('\n')

/** Cuerpo del estado completo (sin BEGIN/COMMIT): lo usan schema.sql y la migración 0001. */
export function fullBody() {
  const prismaSql = prismaDiff('empty', 'prisma/schema.prisma')
  const checks = Object.entries(currentArrayChecks())
    .map(([k, v]) => addArrayCheck(k, v))
    .join('\n')
  const tables = [...createdTables(prismaSql), 'schema_migrations']
  return `${prismaSql}

${SCHEMA_MIGRATIONS_TABLE}

-- ─── Reglas de negocio ──────────────────────────────────────────────────────

-- Las listas solo aceptan códigos del catálogo (src/domain/catalog.ts)
${checks}

${STATIC_RULES}

-- ─── Seguridad ──────────────────────────────────────────────────────────────
${RLS_NOTE}
${enableRls(tables)}`
}

// ─── Migraciones ────────────────────────────────────────────────────────────

export interface MigrationFile {
  version: string
  name: string
  file: string
}

export function listMigrations(): MigrationFile[] {
  if (!existsSync(MIGRATIONS_DIR)) return []
  return readdirSync(MIGRATIONS_DIR)
    .filter((f) => /^\d{4}_[a-z0-9_]+\.sql$/.test(f))
    .sort()
    .map((f) => ({ version: f.slice(0, 4), name: f.slice(5, -4), file: `${MIGRATIONS_DIR}/${f}` }))
}

export const readMigration = (m: MigrationFile) => readFileSync(m.file, 'utf8')

/** Envuelve una migración: transacción, controles de orden y registro en schema_migrations. */
export function wrapMigration(version: string, name: string, body: string, previous: string | null) {
  const guard =
    previous === null
      ? `DO $$ BEGIN
  IF to_regclass('public.schema_migrations') IS NOT NULL OR to_regclass('public.candidates') IS NOT NULL THEN
    RAISE EXCEPTION 'La migración ${version} es para una base vacía y esta ya tiene tablas de Capaz.';
  END IF;
END $$;`
      : `DO $$ BEGIN
  IF to_regclass('public.schema_migrations') IS NULL THEN
    RAISE EXCEPTION 'Falta la tabla schema_migrations: aplica primero la migración 0001.';
  END IF;
  IF EXISTS (SELECT 1 FROM public.schema_migrations WHERE version = '${version}') THEN
    RAISE EXCEPTION 'La migración ${version} ya está aplicada.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.schema_migrations WHERE version = '${previous}') THEN
    RAISE EXCEPTION 'Falta aplicar la migración ${previous} antes que esta.';
  END IF;
END $$;`

  return `-- ============================================================================
-- Capaz · migración ${version}_${name}
-- Generada con \`npm run db:migration -- ${name}\`. No la edites después de aplicarla en Supabase.
--
-- Aplicar: \`npm run db:migrate\`, o pegar este archivo completo en el SQL Editor de Supabase → Run.
-- Corre en una transacción: si algo falla, no se aplica nada. Si ya está aplicada, se detiene sin cambiar nada.
-- ============================================================================

BEGIN;

${guard}

${body.trim()}

INSERT INTO "schema_migrations" ("version", "name") VALUES ('${version}', '${name}');

COMMIT;
`
}

/** database/schema.sql: estado completo + todas las migraciones marcadas como aplicadas. */
export function buildSchemaSql() {
  const migrations = listMigrations()
  const inserts = migrations.length
    ? `INSERT INTO "schema_migrations" ("version", "name") VALUES\n${migrations
        .map((m) => `  ('${m.version}', '${m.name}')`)
        .join(',\n')};`
    : ''
  return `-- ============================================================================
-- Capaz: esquema COMPLETO de la base de datos (PostgreSQL / Supabase)
-- ARCHIVO GENERADO (npm run db:sql). No lo edites a mano: cambia prisma/schema.prisma o
-- src/domain/catalog.ts y crea una migración con \`npm run db:migration -- <nombre>\`.
--
-- Úsalo SOLO para una base vacía: Supabase → SQL Editor → pegar todo → Run.
-- Equivale a aplicar todas las migraciones de database/migrations/ en orden, y las deja
-- registradas como aplicadas. Para una base que ya existe, aplica solo las migraciones nuevas.
-- ============================================================================

BEGIN;

${fullBody()}

-- Migraciones incluidas en este estado
${inserts}

COMMIT;
`
}
