/** Cómo se devuelven los modelos de la base en la API (nunca se devuelven filas crudas). */
import { APPLICATION_STATUSES } from '../domain/catalog.js'
import type { Application, ApplicationEvent, Candidate, Job } from '../generated/prisma/client.js'

const day = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null)

export function jobDto(j: Job) {
  return {
    id: j.id,
    title: j.title,
    company: j.company,
    city: j.city,
    modality: j.modality,
    schedule: j.schedule,
    salaryMin: j.salaryMin,
    salaryMax: j.salaryMax,
    description: j.description,
    tasks: j.tasks,
    requirements: j.requirements,
    easyReadSummary: j.easyReadSummary,
    compatibleDisabilities: j.compatibleDisabilities,
    physicalDemands: j.physicalDemands,
    accommodationsOffered: j.accommodationsOffered,
    keywords: j.keywords,
    minEducation: j.minEducation,
    isActive: j.isActive,
    createdAt: j.createdAt.toISOString(),
  }
}
export type JobDto = ReturnType<typeof jobDto>

/** Perfil completo: solo para la propia persona (GET /api/me). Mismo formato que el registro del front. */
export function profileDto(c: Candidate) {
  return {
    id: c.id,
    idCard: {
      fullName: c.fullName,
      idNumber: c.idNumber,
      birthDate: day(c.birthDate),
      disabilityType: c.disabilityType,
      disabilityPercent: c.disabilityPercent,
      validity: day(c.idCardValidUntil),
    },
    contact: {
      fullName: c.preferredName ?? c.fullName,
      phone: c.phone,
      phoneVerifiedAt: c.phoneVerifiedAt.toISOString(),
      email: c.email,
      city: c.city,
      preferred: c.contactPreference,
    },
    experience: {
      hasWorked: c.hasWorked === null ? null : c.hasWorked ? ('yes' as const) : ('no' as const),
      experienceText: c.experienceText,
      cvFileName: c.cvFileName ?? '',
      education: c.education,
      skills: c.skills,
      accommodationsNeeded: c.accommodationsNeeded,
      otherAccommodation: c.otherAccommodation,
    },
    privacy: {
      useProfile: true as const,
      shareOnlyAccommodations: c.shareOnlyAccommodations,
      discoverable: c.discoverable,
      consentAt: c.consentAt.toISOString(),
    },
    createdAt: c.createdAt.toISOString(),
  }
}

/**
 * "Así te verá la empresa". La empresa ve solo los ajustes que la persona necesita;
 * nunca el carnet ni la cédula, y el tipo y porcentaje de discapacidad solo si la persona lo autoriza.
 */
export function companyViewDto(c: Candidate) {
  return {
    fullName: c.preferredName ?? c.fullName,
    city: c.city,
    contact: { phone: c.phone, email: c.email, preferred: c.contactPreference },
    experienceText: c.experienceText,
    education: c.education,
    skills: c.skills,
    accommodationsNeeded: c.accommodationsNeeded,
    otherAccommodation: c.otherAccommodation,
    disability: c.shareOnlyAccommodations ? null : { type: c.disabilityType, percent: c.disabilityPercent },
  }
}

const statusInfo = (s: Application['status']) => APPLICATION_STATUSES.find((x) => x.value === s)!

export function applicationDto(a: Application & { job: Job; events?: ApplicationEvent[] }) {
  const info = statusInfo(a.status)
  return {
    id: a.id,
    status: a.status,
    statusLabel: info.label,
    /** Etapa 1 a 3 para la barra de progreso (Enviada · En revisión · Entrevista) */
    stage: info.stage,
    matchScore: a.matchScore,
    interview: a.interviewAt ? { at: a.interviewAt.toISOString(), place: a.interviewPlace } : null,
    createdAt: a.createdAt.toISOString(),
    updatedAt: a.updatedAt.toISOString(),
    job: jobDto(a.job),
    ...(a.events && {
      events: a.events.map((e) => ({
        status: e.status,
        statusLabel: statusInfo(e.status).label,
        note: e.note,
        at: e.createdAt.toISOString(),
      })),
    }),
  }
}

/** Datos de la persona en el formato que usa el motor de match. */
export const matchCandidateOf = (c: Candidate) => ({
  disabilityType: c.disabilityType,
  disabilityPercent: c.disabilityPercent,
  city: c.city,
  experienceText: c.experienceText,
  education: c.education,
  skills: c.skills,
  accommodationsNeeded: c.accommodationsNeeded,
  otherAccommodation: c.otherAccommodation,
})
