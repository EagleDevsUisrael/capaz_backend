/** Regenera database/schema.sql (estado completo). npm run db:sql */
import { writeFileSync } from 'node:fs'
import { buildSchemaSql, SCHEMA_SQL } from './lib.ts'

writeFileSync(SCHEMA_SQL, buildSchemaSql())
console.log('database/schema.sql generado')
