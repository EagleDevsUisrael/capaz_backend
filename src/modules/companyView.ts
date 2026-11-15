/**
 * POST /api/company-view/preview: "Así te verá la empresa" en el paso 4, ANTES de crear la cuenta.
 * Recibe lo que la persona llenó (mismo formato que el registro) y devuelve exactamente lo que vería la empresa.
 * No guarda nada. Con cuenta, el mismo resultado sale de GET /api/me/company-view.
 */
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import { companyView } from './dto.js'
import { contactData, disabilityType, experienceData } from './schemas.js'

const body = z.object({
  contact: contactData.pick({ fullName: true, city: true }).extend({
    phone: z.string().max(10).optional(),
    email: z.string().max(160).optional(),
    preferred: z.string().max(20).optional(),
  }),
  experience: experienceData.partial().default({}),
  privacy: z.object({ shareOnlyAccommodations: z.boolean() }),
  /** Solo se usa si shareOnlyAccommodations es false */
  idCard: z.object({ disabilityType, disabilityPercent: z.number().int().min(1).max(100) }).partial().optional(),
})

export const companyViewRoutes: FastifyPluginAsyncZod = async (app) => {
  app.post(
    '/company-view/preview',
    { schema: { tags: ['registro'], body }, config: { rateLimit: { max: 60, timeWindow: '1 minute' } } },
    async (req) => {
      const { contact, experience, privacy, idCard } = req.body
      return companyView({
        fullName: contact.fullName,
        city: contact.city,
        phone: contact.phone ?? null,
        email: contact.email ?? null,
        contactPreference: contact.preferred ?? null,
        education: experience.education ?? null,
        hasWorked: experience.hasWorked == null ? null : experience.hasWorked === 'yes',
        experienceText: experience.experienceText ?? '',
        skills: experience.skills ?? [],
        accommodationsNeeded: experience.accommodationsNeeded ?? [],
        otherAccommodation: experience.otherAccommodation ?? '',
        shareOnlyAccommodations: privacy.shareOnlyAccommodations,
        disabilityType: idCard?.disabilityType ?? null,
        disabilityPercent: idCard?.disabilityPercent ?? null,
      })
    },
  )
}
