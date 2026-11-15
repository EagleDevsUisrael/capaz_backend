import { createCipheriv, createDecipheriv, createHash, randomBytes, randomInt, timingSafeEqual } from 'node:crypto'
import { env } from '../config/env.js'

// ── Cifrado de las fotos del carnet (AES-256-GCM) ──
// Formato guardado: [1 byte versión][12 bytes IV][16 bytes tag][datos cifrados]
const VERSION = 1

let cachedKey: Buffer | null = null
function key(): Buffer {
  if (cachedKey) return cachedKey
  const k = Buffer.from(env.ID_CARD_ENCRYPTION_KEY, 'base64')
  if (k.length !== 32) throw new Error('ID_CARD_ENCRYPTION_KEY debe ser 32 bytes en base64')
  cachedKey = k
  return k
}

export function encrypt(plain: Buffer): Uint8Array<ArrayBuffer> {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key(), iv)
  const data = Buffer.concat([cipher.update(plain), cipher.final()])
  const out = Buffer.concat([Buffer.from([VERSION]), iv, cipher.getAuthTag(), data])
  return new Uint8Array(out)
}

export function decrypt(stored: Uint8Array): Buffer {
  const buf = Buffer.from(stored)
  if (buf[0] !== VERSION) throw new Error('Versión de cifrado desconocida')
  const iv = buf.subarray(1, 13)
  const tag = buf.subarray(13, 29)
  const decipher = createDecipheriv('aes-256-gcm', key(), iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(buf.subarray(29)), decipher.final()])
}

// ── Tokens y códigos ──
export const sha256 = (s: string) => createHash('sha256').update(s).digest('hex')

/** Token opaco para sesiones y enlaces de traspaso (se guarda solo su hash). */
export const newToken = () => randomBytes(32).toString('base64url')

/** Código de 4 dígitos para el ingreso. */
export const newLoginCode = () => String(randomInt(0, 10_000)).padStart(4, '0')

export function safeEqualHex(a: string, b: string) {
  const ba = Buffer.from(a, 'hex')
  const bb = Buffer.from(b, 'hex')
  return ba.length === bb.length && timingSafeEqual(ba, bb)
}
