import 'dotenv/config'
import { defineConfig } from 'prisma/config'

// La app usa DATABASE_URL (pooler de Supabase) a través de @prisma/adapter-pg (src/lib/prisma.ts).
// La CLI de Prisma (db push, migrate, introspección) usa DIRECT_URL: conexión directa, sin pooler.
export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: { url: process.env.DIRECT_URL || process.env.DATABASE_URL },
})
