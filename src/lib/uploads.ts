import type { FastifyRequest } from 'fastify'
import { badRequest, unprocessable } from './errors.js'

export interface UploadedFile {
  field: string
  data: Buffer
  mime: string
  filename: string
}

/** Tipo real según los primeros bytes (no confiamos en el Content-Type que manda el navegador). */
export function sniffMime(b: Buffer): string | null {
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg'
  if (b.length >= 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png'
  if (b.length >= 5 && b.subarray(0, 5).toString('latin1') === '%PDF-') return 'application/pdf'
  if (b.length >= 12 && b.subarray(4, 8).toString('latin1') === 'ftyp') {
    const brand = b.subarray(8, 12).toString('latin1')
    if (['heic', 'heix', 'hevc', 'heim', 'heis', 'mif1', 'msf1'].includes(brand)) return 'image/heic'
  }
  if (b.length >= 12 && b.subarray(0, 4).toString('latin1') === 'RIFF' && b.subarray(8, 12).toString('latin1') === 'WEBP') return 'image/webp'
  return null
}

const AUDIO_PREFIXES = ['audio/']

/** Lee los archivos de un multipart/form-data (los campos de texto se devuelven aparte). */
export async function readMultipart(req: FastifyRequest) {
  if (!req.isMultipart()) throw badRequest('NOT_MULTIPART', 'Envía los archivos como multipart/form-data.')
  const files: UploadedFile[] = []
  const fields: Record<string, string> = {}
  for await (const part of req.parts()) {
    if (part.type === 'file') {
      files.push({ field: part.fieldname, data: await part.toBuffer(), mime: part.mimetype, filename: part.filename })
    } else {
      fields[part.fieldname] = String(part.value)
    }
  }
  return { files, fields }
}

/** Fotos del carnet: JPG, PNG, HEIC, WEBP o PDF (documento: hasta 10 MB). */
export function requireIdCardImage(files: UploadedFile[], field: string) {
  const f = files.find((x) => x.field === field)
  const label = field === 'front' ? 'frente' : 'reverso'
  if (!f || f.data.length === 0) {
    throw badRequest('MISSING_FILE', `Falta la foto del ${label} del carnet.`, { [field]: 'Falta la foto' })
  }
  const mime = sniffMime(f.data)
  if (!mime) {
    throw unprocessable('UNSUPPORTED_FILE', `La foto del ${label} no es JPG, PNG, HEIC o PDF.`, {
      [field]: 'Formato no admitido',
    })
  }
  return { data: f.data, mime }
}

export function requireAudio(files: UploadedFile[]) {
  const f = files.find((x) => x.field === 'audio')
  if (!f || f.data.length === 0) throw badRequest('MISSING_FILE', 'Falta el audio.', { audio: 'Falta el audio' })
  if (!AUDIO_PREFIXES.some((p) => f.mime.startsWith(p)) && f.mime !== 'video/webm') {
    throw unprocessable('UNSUPPORTED_FILE', 'El archivo no es un audio.', { audio: 'Formato no admitido' })
  }
  return { data: f.data, mime: f.mime }
}
