/**
 * Perfil de la persona ("Mi perfil"; el diseño está pendiente).
 *
 * GET    /api/me               perfil completo (solo lo ve la propia persona)
 * PATCH  /api/me               cambia contacto (un número nuevo exige phoneVerificationId),, experiencia o privacidad (cada cambio de permiso queda registrado)
 * GET    /api/me/company-view  "Así te verá la empresa"
 * GET    /api/me/export        descarga todos sus datos en JSON (LOPDP)
 * DELETE /api/me               borra todo: cuenta, carnet, postulaciones, sesiones y consentimientos
 */
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { notFound, unprocessable } from '../lib/errors.js'
import { recordConsents } from '../lib/sessions.js'
import { candidateIdOf } from '../plugins/auth.js'
import { applicationDto, companyViewDto, profileDto } from './dto.js'
import { consumeVerifiedPhone } from './phone.js'
import { contactData, experienceData, uuid } from './schemas.js'

const patchBody = z.object({
  contact: contactData.partial().optional(),
  /** Obligatorio si cambia contact.phone (el login envía el código a ese número) */
  phoneVerificationId: uuid.optional(),
  experience: experienceData.partial().optional(),
  privacy: z.object({ shareOnlyAccommodations: z.boolean(), discoverable: z.boolean() }).partial().optional(),
})

export const meRoutes: FastifyPluginAsyncZod = async (app) => {
  const auth = { preHandler: app.authenticate }
  const sec = { tags: ['perfil'], security: [{ session: [] }] }

  const load = async (id: string) => {
    const c = await app.db.candidate.findUnique({ where: { id } })
    if (!c) throw notFound()
    return c
  }

  app.get('/me', { ...auth, schema: sec }, async (req) => profileDto(await load(candidateIdOf(req))))

  app.patch('/me', { ...auth, schema: { ...sec, body: patchBody } }, async (req) => {
    const id = candidateIdOf(req)
    const current = await load(id)
    const { contact, experience, privacy, phoneVerificationId } = req.body
    const phoneChanged = contact?.phone !== undefined && contact.phone !== current.phone
    if (phoneChanged && !phoneVerificationId) {
      throw unprocessable('PHONE_NOT_VERIFIED', 'Confirma tu nuevo celular con el código de 4 dígitos.', {
        phoneVerificationId: 'Celular sin verificar',
      })
    }
    const updated = await app.db.$transaction(async (tx) => {
      const phoneVerifiedAt = phoneChanged ? await consumeVerifiedPhone(tx, phoneVerificationId!, contact!.phone!) : null
      const c = await tx.candidate.update({
        where: { id },
        data: {
          ...(contact?.fullName !== undefined && {
            preferredName: contact.fullName !== current.fullName ? contact.fullName : null,
          }),
          ...(phoneChanged && { phone: contact!.phone!, phoneVerifiedAt: phoneVerifiedAt! }),
          ...(contact?.email !== undefined && { email: contact.email.toLowerCase() }),
          ...(contact?.city !== undefined && { city: contact.city }),
          ...(contact?.preferred !== undefined && { contactPreference: contact.preferred }),
          ...(experience?.hasWorked !== undefined && {
            hasWorked: experience.hasWorked === null ? null : experience.hasWorked === 'yes',
          }),
          ...(experience?.experienceText !== undefined && { experienceText: experience.experienceText }),
          ...(experience?.cvFileName !== undefined && { cvFileName: experience.cvFileName || null }),
          ...(experience?.education !== undefined && { education: experience.education }),
          ...(experience?.skills !== undefined && { skills: experience.skills }),
          ...(experience?.accommodationsNeeded !== undefined && { accommodationsNeeded: experience.accommodationsNeeded }),
          ...(experience?.otherAccommodation !== undefined && { otherAccommodation: experience.otherAccommodation }),
          ...(privacy?.shareOnlyAccommodations !== undefined && { shareOnlyAccommodations: privacy.shareOnlyAccommodations }),
          ...(privacy?.discoverable !== undefined && { discoverable: privacy.discoverable }),
        },
      })
      const changed = {
        ...(privacy?.shareOnlyAccommodations !== undefined &&
          privacy.shareOnlyAccommodations !== current.shareOnlyAccommodations && {
            shareOnlyAccommodations: privacy.shareOnlyAccommodations,
          }),
        ...(privacy?.discoverable !== undefined &&
          privacy.discoverable !== current.discoverable && { discoverable: privacy.discoverable }),
      }
      await recordConsents(app, tx, req, id, changed)
      return c
    })
    return profileDto(updated)
  })

  app.get('/me/company-view', { ...auth, schema: sec }, async (req) => companyViewDto(await load(candidateIdOf(req))))

  app.get('/me/export', { ...auth, schema: sec }, async (req, reply) => {
    const id = candidateIdOf(req)
    const c = await app.db.candidate.findUnique({
      where: { id },
      include: {
        consents: { orderBy: { createdAt: 'asc' } },
        applications: { include: { job: true, events: { orderBy: { createdAt: 'asc' } } } },
        cvFile: { select: { fileName: true, mime: true, sizeBytes: true, createdAt: true } },
        idCardScans: { select: { id: true, status: true, createdAt: true, confirmedAt: true, frontImage: true, ocrProvider: true } },
      },
    })
    if (!c) throw notFound()
    const data = {
      exportedAt: new Date().toISOString(),
      profile: profileDto(c),
      consents: c.consents.map((x) => ({
        purpose: x.purpose,
        granted: x.granted,
        policyVersion: x.policyVersion,
        at: x.createdAt.toISOString(),
      })),
      applications: c.applications.map((a) => applicationDto(a)),
      cv: c.cvFile
        ? { fileName: c.cvFile.fileName, mime: c.cvFile.mime, sizeBytes: c.cvFile.sizeBytes, uploadedAt: c.cvFile.createdAt.toISOString(), download: '/api/me/cv' }
        : null,
      idCardScans: c.idCardScans.map((s) => ({
        status: s.status,
        ocrProvider: s.ocrProvider,
        createdAt: s.createdAt.toISOString(),
        confirmedAt: s.confirmedAt?.toISOString() ?? null,
        imagesStored: s.frontImage != null,
      })),
    }
    return reply
      .header('Content-Disposition', 'attachment; filename="mis-datos-capaz.json"')
      .header('Cache-Control', 'no-store')
      .send(data)
  })

  app.delete('/me', { ...auth, schema: sec }, async (req, reply) => {
    // ON DELETE CASCADE borra sesiones, códigos, consentimientos, fotos del carnet y postulaciones
    await app.db.candidate.delete({ where: { id: candidateIdOf(req) } })
    return reply.status(204).send()
  })
}
