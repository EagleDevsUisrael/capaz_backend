/**
 * Paso 1 del registro: fotos del carnet → OCR → la persona confirma los datos.
 *
 *   POST /api/id-card/scan                         multipart (front, back) → datos leídos
 *   POST /api/id-card/handoffs                     "Continuar en el celular": crea el enlace del QR (10 min)
 *   GET  /api/id-card/handoffs/:token              estado (la computadora consulta por polling)
 *   PUT  /api/id-card/handoffs/:token/:side        el celular sube la foto (multipart: image)
 *   GET  /api/id-card/handoffs/:token/:side        la computadora muestra la foto tomada
 *   POST /api/id-card/handoffs/:token/scan         la computadora pide el OCR con las fotos del celular
 *
 * Las fotos se guardan cifradas. Las de los traspasos se borran al pedir el OCR; las del escaneo,
 * al confirmar el registro (salvo que la persona acepte guardarlas).
 */
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { isValidCedula } from '../domain/cedula.js'
import { decrypt, encrypt, newToken, sha256 } from '../lib/crypto.js'
import { HttpError, gone, notFound, unprocessable } from '../lib/errors.js'
import { readMultipart, requireIdCardImage } from '../lib/uploads.js'
import { LOW_CONFIDENCE, type IdCardImage, type OcrResult } from '../services/ocr.js'

export const SCAN_TTL_MS = 2 * 60 * 60 * 1000

export const HANDOFF_TTL_MS = 10 * 60 * 1000

const tokenParam = z.object({ token: z.string().min(20).max(100) })
const sideParam = tokenParam.extend({ side: z.enum(['front', 'back']) })

export const idCardRoutes: FastifyPluginAsyncZod = async (app) => {
  const limit = { rateLimit: { max: 10, timeWindow: '1 minute' } }

  async function scan(front: IdCardImage, back: IdCardImage) {
    let result: OcrResult
    try {
      result = await app.services.ocr.readIdCard(front, back)
    } catch (err) {
      app.log.warn({ err }, 'No se pudo validar el documento con OCR')
      if (err instanceof HttpError) throw err
      throw unprocessable(
        'ID_CARD_UNREADABLE',
        'No pudimos validar el documento. Toma otras fotos con buena luz y con el NUI o número de cédula visible.',
      )
    }

    const identityFields: Record<string, string> = {}
    if (result.fields.fullName.trim().length < 3) identityFields.fullName = 'No se pudo leer el nombre'
    if (!isValidCedula(result.fields.idNumber)) identityFields.idNumber = 'No se pudo leer un NUI o número de cédula válido'
    if (Object.keys(identityFields).length) {
      throw unprocessable(
        'ID_CARD_UNREADABLE',
        'La foto no permite validar la identidad. Toma otras fotos completas, nítidas y sin reflejos.',
        identityFields,
      )
    }

    const disabilityFields: Record<string, string> = {}
    if (!result.fields.disabilityType) disabilityFields.disabilityType = 'No se encontró el tipo de discapacidad'
    if (!result.fields.disabilityPercent || result.fields.disabilityPercent < 1) {
      disabilityFields.disabilityPercent = 'No se encontró el porcentaje de discapacidad'
    }
    if (Object.keys(disabilityFields).length) {
      throw unprocessable(
        'DISABILITY_DATA_NOT_FOUND',
        'No encontramos información de discapacidad en el documento. Sube fotos más claras o actualiza tu cédula mediante el MSP.',
        disabilityFields,
      )
    }
    const saved = await app.db.idCardScan.create({
      data: {
        frontImage: encrypt(front.data),
        frontMime: front.mime,
        backImage: encrypt(back.data),
        backMime: back.mime,
        extracted: result.fields as object,
        confidence: result.confidence as object,
        ocrProvider: result.provider,
        expiresAt: new Date(Date.now() + SCAN_TTL_MS),
      },
      select: { id: true, expiresAt: true },
    })
    const needsReview = Object.entries(result.confidence)
      .filter(([, v]) => v < LOW_CONFIDENCE)
      .map(([k]) => k)
    return {
      scanId: saved.id,
      ...result.fields,
      confidence: result.confidence,
      /** Campos que la persona debe revisar ("Leímos estos datos") */
      needsReview,
      idNumberValid: true,
      expiresAt: saved.expiresAt.toISOString(),
    }
  }

  app.post(
    '/id-card/scan',
    { schema: { tags: ['carnet'], consumes: ['multipart/form-data'] }, config: limit },
    async (req) => {
      const { files } = await readMultipart(req)
      return scan(requireIdCardImage(files, 'front'), requireIdCardImage(files, 'back'))
    },
  )

  // ── Traspaso computadora → celular ──

  async function liveHandoff(token: string) {
    const h = await app.db.idCardHandoff.findUnique({ where: { tokenHash: sha256(token) } })
    if (!h) throw notFound('Este enlace no existe. Vuelve a escanear el código QR.')
    if (h.consumedAt) throw gone('HANDOFF_USED', 'Este enlace ya se usó. Genera uno nuevo en la computadora.')
    if (h.expiresAt < new Date()) throw gone('HANDOFF_EXPIRED', 'Este enlace venció. Genera uno nuevo en la computadora.')
    return h
  }

  app.post('/id-card/handoffs', { schema: { tags: ['carnet'] }, config: limit }, async (_req, reply) => {
    const token = newToken()
    const h = await app.db.idCardHandoff.create({
      data: { tokenHash: sha256(token), expiresAt: new Date(Date.now() + HANDOFF_TTL_MS) },
    })
    const url = new URL('/signup/id-card/camera', app.config.PUBLIC_WEB_URL)
    url.searchParams.set('handoff', token)
    return reply.status(201).send({ token, url: url.toString(), expiresAt: h.expiresAt.toISOString() })
  })

  app.get('/id-card/handoffs/:token', { schema: { tags: ['carnet'], params: tokenParam } }, async (req) => {
    const h = await app.db.idCardHandoff.findUnique({ where: { tokenHash: sha256(req.params.token) } })
    if (!h) throw notFound('Este enlace no existe.')
    const sides = { front: h.frontImage != null, back: h.backImage != null }
    const status = h.consumedAt
      ? 'consumed'
      : h.expiresAt < new Date()
        ? 'expired'
        : sides.front && sides.back
          ? 'ready'
          : sides.front || sides.back
            ? 'partial'
            : 'waiting'
    return { status, sides, expiresAt: h.expiresAt.toISOString() }
  })

  app.put(
    '/id-card/handoffs/:token/:side',
    { schema: { tags: ['carnet'], params: sideParam, consumes: ['multipart/form-data'] }, config: limit },
    async (req) => {
      const h = await liveHandoff(req.params.token)
      const { files } = await readMultipart(req)
      const img = requireIdCardImage(
        files.map((f) => (f.field === 'image' ? { ...f, field: req.params.side } : f)),
        req.params.side,
      )
      const data =
        req.params.side === 'front'
          ? { frontImage: encrypt(img.data), frontMime: img.mime }
          : { backImage: encrypt(img.data), backMime: img.mime }
      const u = await app.db.idCardHandoff.update({ where: { id: h.id }, data })
      return { sides: { front: u.frontImage != null, back: u.backImage != null } }
    },
  )

  app.get('/id-card/handoffs/:token/:side', { schema: { tags: ['carnet'], params: sideParam } }, async (req, reply) => {
    const h = await liveHandoff(req.params.token)
    const img = req.params.side === 'front' ? h.frontImage : h.backImage
    const mime = req.params.side === 'front' ? h.frontMime : h.backMime
    if (!img || !mime) throw notFound('Todavía no llega esa foto.')
    return reply.header('Content-Type', mime).header('Cache-Control', 'no-store').send(decrypt(img))
  })

  app.post(
    '/id-card/handoffs/:token/scan',
    { schema: { tags: ['carnet'], params: tokenParam }, config: limit },
    async (req) => {
      const h = await liveHandoff(req.params.token)
      if (!h.frontImage || !h.backImage || !h.frontMime || !h.backMime) {
        throw gone('HANDOFF_INCOMPLETE', 'Faltan fotos: toma el frente y el reverso con el celular.')
      }
      const result = await scan(
        { data: decrypt(h.frontImage), mime: h.frontMime },
        { data: decrypt(h.backImage), mime: h.backMime },
      )
      // Las fotos ya están en el escaneo: el traspaso se cierra y se borran sus copias
      await app.db.idCardHandoff.update({
        where: { id: h.id },
        data: { consumedAt: new Date(), frontImage: null, backImage: null, frontMime: null, backMime: null },
      })
      return result
    },
  )
}
