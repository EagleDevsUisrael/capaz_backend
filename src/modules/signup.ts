/**
 * POST /api/signup: envío final del registro de 4 pasos (reemplaza el sessionStorage del front).
 * Exige el celular verificado (POST /api/phone-verifications). Crea la cuenta, registra el consentimiento, borra las fotos del carnet y devuelve la sesión. Si viene `applyToJobId`, también crea la postulación.
 */
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { scoreJob } from '../domain/matchEngine.js'
import { Prisma } from '../generated/prisma/client.js'
import { conflict, gone, notFound } from '../lib/errors.js'
import { createSession, recordConsents } from '../lib/sessions.js'
import { matchCandidateOf, profileDto } from './dto.js'
import { claimCvUpload } from './cv.js'
import { consumeVerifiedPhone } from './phone.js'
import { contactData, experienceData, idCardData, privacyData, uuid } from './schemas.js'

const body = z.object({
  /** scanId que devolvió POST /api/id-card/scan */
  scanId: uuid,
  idCard: idCardData,
  contact: contactData,
  /** verificationId de POST /api/phone-verifications, ya verificado y del mismo número que contact.phone */
  phoneVerificationId: uuid,
  experience: experienceData.default(experienceData.parse({})),
  privacy: privacyData,
  /** Oferta a la que la persona quería postular antes de registrarse (pendingJob del front) */
  applyToJobId: uuid.nullable().optional(),
  /** cvUploadId de POST /api/cv-uploads (hoja de vida opcional del paso 3) */
  cvUploadId: uuid.nullable().optional(),
})

export const signupRoutes: FastifyPluginAsyncZod = async (app) => {
  app.post(
    '/signup',
    {
      schema: { tags: ['registro'], body },
      config: { rateLimit: { max: 5, timeWindow: '1 minute' } },
    },
    async (req, reply) => {
      const { scanId, idCard, contact, phoneVerificationId, experience, privacy, applyToJobId, cvUploadId } = req.body

      const scan = await app.db.idCardScan.findUnique({ where: { id: scanId } })
      if (!scan || scan.status !== 'pending') {
        throw notFound('No encontramos las fotos de tu carnet. Vuelve al paso 1.')
      }
      if (scan.expiresAt < new Date()) {
        throw gone('SCAN_EXPIRED', 'Pasó mucho tiempo desde que subiste el carnet. Vuelve a tomar las fotos.')
      }
      const exists = await app.db.candidate.findUnique({ where: { idNumber: idCard.idNumber }, select: { id: true } })
      if (exists) throw conflict('ALREADY_REGISTERED', 'Ya tienes una cuenta con esta cédula. Ingresa con tu cédula.')

      const job = applyToJobId
        ? await app.db.job.findFirst({ where: { id: applyToJobId, isActive: true } })
        : null

      const now = new Date()
      try {
        const result = await app.db.$transaction(async (tx) => {
          const phoneVerifiedAt = await consumeVerifiedPhone(tx, phoneVerificationId, contact.phone)
          const candidate = await tx.candidate.create({
            data: {
              idNumber: idCard.idNumber,
              fullName: idCard.fullName,
              birthDate: idCard.birthDate ? new Date(idCard.birthDate) : null,
              disabilityType: idCard.disabilityType,
              disabilityPercent: idCard.disabilityPercent,
              idCardValidUntil: idCard.validity && idCard.validity !== 'indefinite' ? new Date(idCard.validity) : null,
              idCardValidIndefinitely: idCard.validity === 'indefinite',
              preferredName: contact.fullName !== idCard.fullName ? contact.fullName : null,
              phone: contact.phone,
              phoneVerifiedAt,
              email: contact.email.toLowerCase(),
              city: contact.city,
              contactPreference: contact.preferred,
              hasWorked: experience.hasWorked === null ? null : experience.hasWorked === 'yes',
              experienceText: experience.experienceText,
              cvFileName: cvUploadId ? null : experience.cvFileName || null,
              education: experience.education,
              skills: experience.skills,
              accommodationsNeeded: experience.accommodationsNeeded,
              otherAccommodation: experience.otherAccommodation,
              shareOnlyAccommodations: privacy.shareOnlyAccommodations,
              discoverable: privacy.discoverable,
              consentAt: now,
            },
          })

          const cvFileName = cvUploadId ? await claimCvUpload(tx, cvUploadId, candidate.id) : null
          if (cvFileName) await tx.candidate.update({ where: { id: candidate.id }, data: { cvFileName } })

          await recordConsents(app, tx, req, candidate.id, {
            useProfile: true,
            shareOnlyAccommodations: privacy.shareOnlyAccommodations,
            discoverable: privacy.discoverable,
          })

          await tx.idCardScan.update({
            where: { id: scan.id },
            data: {
              candidateId: candidate.id,
              status: 'confirmed',
              confirmedAt: now,
              // Las fotos del carnet siempre se borran al confirmar los datos
              frontImage: null,
              backImage: null,
              frontMime: null,
              backMime: null,
            },
          })

          let applicationId: string | null = null
          if (job) {
            const a = await tx.application.create({
              data: {
                candidateId: candidate.id,
                jobId: job.id,
                matchScore: scoreJob(matchCandidateOf(candidate), job).score,
                events: { create: { status: 'sent' } },
              },
            })
            applicationId = a.id
          }

          const session = await createSession(app, candidate.id, tx)
          return { candidate: { ...candidate, cvFileName: cvFileName ?? candidate.cvFileName }, session, applicationId }
        })

        return reply.status(201).send({
          ...result.session,
          candidate: profileDto(result.candidate),
          applicationId: result.applicationId,
        })
      } catch (e) {
        if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
          throw conflict('ALREADY_REGISTERED', 'Ya tienes una cuenta con esta cédula. Ingresa con tu cédula.')
        }
        throw e
      }
    },
  )
}
