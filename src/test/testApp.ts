/**
 * App de pruebas: Postgres real en memoria (PGlite) servido por un socket local,
 * con el mismo database/schema.sql que se pega en Supabase.
 */
import { PGlite } from '@electric-sql/pglite'
import { PGLiteSocketServer } from '@electric-sql/pglite-socket'
import { readFileSync } from 'node:fs'
import { buildApp } from '../app.js'
import { env } from '../config/env.js'
import { createPrisma } from '../lib/prisma.js'

export async function createTestApp() {
  const pg = new PGlite()
  await pg.exec(readFileSync(new URL('../../database/schema.sql', import.meta.url), 'utf8'))
  const port = 40000 + Math.floor(Math.random() * 20000)
  const server = new PGLiteSocketServer({ db: pg, port, host: '127.0.0.1' })
  await server.start()

  // PGlite atiende una conexión a la vez
  const db = createPrisma(`postgresql://postgres:postgres@127.0.0.1:${port}/postgres?sslmode=disable&pgbouncer=true`, 1)
  const app = await buildApp({ db, config: env, logger: false })
  await app.ready()

  return {
    app,
    db,
    async close() {
      await app.close()
      await db.$disconnect()
      await server.stop()
      await pg.close()
    },
  }
}

export const admin = { authorization: `Bearer ${env.ADMIN_TOKEN}` }
export const bearer = (token: string) => ({ authorization: `Bearer ${token}` })

/** multipart/form-data a mano para app.inject */
export function multipart(files: Record<string, { data: Buffer; filename: string; type: string }>, fields: Record<string, string> = {}) {
  const boundary = '----capaz' + Math.random().toString(16).slice(2)
  const parts: Buffer[] = []
  for (const [name, value] of Object.entries(fields)) {
    parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}\r\n`))
  }
  for (const [name, f] of Object.entries(files)) {
    parts.push(
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="${name}"; filename="${f.filename}"\r\nContent-Type: ${f.type}\r\n\r\n`,
      ),
      f.data,
      Buffer.from('\r\n'),
    )
  }
  parts.push(Buffer.from(`--${boundary}--\r\n`))
  return { payload: Buffer.concat(parts), headers: { 'content-type': `multipart/form-data; boundary=${boundary}` } }
}

/** JPEG mínimo (solo la firma; el OCR simulado no decodifica la imagen) */
export const fakeJpeg = (seed: string) =>
  Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.from(seed), Buffer.from([0xff, 0xd9])])
