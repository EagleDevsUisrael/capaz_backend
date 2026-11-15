/**
 * Crea la siguiente migración comparando el modelo actual con el de la última migración.
 *
 *   npm run db:migration -- agregar_telefono_alterno
 *
 * Escribe database/migrations/NNNN_<nombre>.sql, actualiza database/.snapshot/ y regenera database/schema.sql.
 * Revisa el SQL antes de subirlo: Prisma no sabe de renombres (los ve como borrar + crear) ni de datos existentes.
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import {
  arrayCheckDiff,
  buildSchemaSql,
  createdTables,
  currentArrayChecks,
  enableRls,
  fullBody,
  listMigrations,
  MIGRATIONS_DIR,
  path,
  prismaDiff,
  RLS_NOTE,
  SCHEMA_SQL,
  SNAPSHOT_CATALOG,
  SNAPSHOT_SCHEMA,
  wrapMigration,
  type ArrayChecks,
} from './lib.ts'

const name = (process.argv[2] ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
if (!name) {
  console.error('Falta el nombre. Uso: npm run db:migration -- <nombre_en_snake_case>')
  process.exit(1)
}

const existing = listMigrations()
const version = String(existing.length + 1).padStart(4, '0')
const previous = existing.at(-1)?.version ?? null

let body: string
if (previous === null) {
  body = fullBody()
} else {
  if (!existsSync(SNAPSHOT_SCHEMA) || !existsSync(SNAPSHOT_CATALOG)) {
    console.error('Falta database/.snapshot/: no se puede calcular la diferencia con la migración anterior.')
    process.exit(1)
  }
  const prismaSql = prismaDiff(SNAPSHOT_SCHEMA, 'prisma/schema.prisma')
  const before = JSON.parse(readFileSync(SNAPSHOT_CATALOG, 'utf8')) as ArrayChecks
  const checksSql = arrayCheckDiff(before, currentArrayChecks())
  const newTables = createdTables(prismaSql)
  const parts = [
    prismaSql && !/^-- This is an empty migration\.?$/m.test(prismaSql) ? prismaSql : '',
    checksSql && `-- Catálogo (src/domain/catalog.ts)\n${checksSql}`,
    newTables.length ? `${RLS_NOTE}\n${enableRls(newTables)}` : '',
  ].filter(Boolean)
  if (parts.length === 0) {
    console.error('No hay cambios desde la última migración: no se creó nada.')
    process.exit(1)
  }
  body = parts.join('\n\n')
}

mkdirSync(MIGRATIONS_DIR, { recursive: true })
const file = `${MIGRATIONS_DIR}/${version}_${name}.sql`
writeFileSync(file, wrapMigration(version, name, body, previous))

mkdirSync(path('database/.snapshot'), { recursive: true })
copyFileSync(path('prisma/schema.prisma'), SNAPSHOT_SCHEMA)
writeFileSync(SNAPSHOT_CATALOG, JSON.stringify(currentArrayChecks(), null, 2) + '\n')
writeFileSync(SCHEMA_SQL, buildSchemaSql())

console.log(`Creada database/migrations/${version}_${name}.sql (y regenerado database/schema.sql).`)
console.log('Revisa el SQL antes de hacer commit: renombres y datos existentes se ajustan a mano.')
