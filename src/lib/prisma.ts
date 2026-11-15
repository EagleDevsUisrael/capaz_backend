import { PrismaPg } from '@prisma/adapter-pg'
import { env } from '../config/env.js'
import { PrismaClient } from '../generated/prisma/client.js'

/**
 * Parámetros de la URL que son pistas para Prisma y no opciones de Postgres.
 * Con el adaptador `pg` de Prisma 7 no hacen falta (no usa sentencias preparadas con nombre),
 * pero se aceptan en DATABASE_URL para seguir la convención de Supabase y se quitan antes de conectar.
 */
const PRISMA_ONLY_PARAMS = ['pgbouncer', 'connection_limit', 'pool_timeout', 'statement_cache_size', 'schema']

export function pgConnectionString(url: string) {
  try {
    const u = new URL(url)
    for (const p of PRISMA_ONLY_PARAMS) u.searchParams.delete(p)
    return u.toString()
  } catch {
    return url
  }
}

/** Cliente de Prisma con el driver `pg`. En Supabase, DATABASE_URL es el transaction pooler (puerto 6543). */
export function createPrisma(connectionString = env.DATABASE_URL, poolMax?: number) {
  return new PrismaClient({
    adapter: new PrismaPg({ connectionString: pgConnectionString(connectionString), ...(poolMax && { max: poolMax }) }),
  })
}

export type Db = ReturnType<typeof createPrisma>
