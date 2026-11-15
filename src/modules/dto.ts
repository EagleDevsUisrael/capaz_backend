/** Cómo se devuelven los modelos de la base en la API (nunca se devuelven filas crudas). */
import { APPLICATION_STATUSES, EDUCATION_LEVELS, labelOf, REVIEW_BUSINESS_DAYS } from '../domain/catalog.js'
import type { Application, ApplicationEvent, Candidate, Job } from '../generated/prisma/client.js'

const day = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null)

export interface EasyRead {
  jobTitle: string
  whatYouDo: string[]
  whereAndWhen: string[]
  pay: string[]
  whatYouGet: string[]
  whatYouNeed: string[]
}

export function jobDto(j: Job) {
  return {
    id: j.id,
    title: j.title,
    company: j.company,
    city: j.city,
    province: j.province,
    modality: j.modality,
    schedule: j.schedule,
    dailyHours: j.dailyHours,
    salaryMin: j.salaryMin,
    salaryMax: j.salaryMax,
    /** Tarjeta de la lista */
    summary: j.summary,
    /** "Qué harás" */
    description: j.description,
    tasks: j.tasks,
    /** "Qué necesitas" */
    requirements: j.requirements,
    /** "Ajustes que ofrece la empresa" en detalle */
    accommodationsDetail: j.accommodationsDetail,
    /** "Salario y beneficios" */
    salaryBenefits: j.salaryBenefits,
    easyReadSummary: j.easyReadSummary,
    /** Lectura fácil por secciones (null si el admin no la escribió) */
    easyRead: (j.easyRead as EasyRead | null) ?? null,
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

/** Vigencia en la API: 'AAAA-MM-DD', 'indefinite' o null. */
export const validityOf = (c: Pick<Candidate, 'idCardValidIndefinitely' | 'idCardValidUntil'>) =>
  c.idCardValidIndefinitely ? ('indefinite' as const) : day(c.idCardValidUntil)

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
      validity: validityOf(c),
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
 * "2 años en call center": primera oración de la experiencia, recortada a ~80 caracteres.
 * Sin texto: "Busca su primer empleo" si marcó que no ha trabajado; si no, null.
 */
export function experienceSummary(text: string | null | undefined, hasWorked: boolean | null | undefined) {
  const t = (text ?? '').trim().replace(/\s+/g, ' ')
  if (!t) return hasWorked === false ? 'Busca su primer empleo' : null
  const first = t.split(/(?<=[.!?])\s/)[0]!.replace(/[.!?]+$/, '')
  if (first.length <= 80) return first
  const cut = first.slice(0, 78)
  return `${cut.slice(0, cut.lastIndexOf(' ') > 40 ? cut.lastIndexOf(' ') : 78)}…`
}

export interface CompanyViewInput {
  fullName: string
  city: string
  phone?: string | null
  email?: string | null
  contactPreference?: string | null
  education: string | null
  hasWorked: boolean | null
  experienceText: string
  skills: string[]
  accommodationsNeeded: string[]
  otherAccommodation: string
  shareOnlyAccommodations: boolean
  disabilityType?: string | null
  disabilityPercent?: number | null
}

/**
 * "Así te verá la empresa" (paso 4 y perfil): nombre, ciudad, estudios, experiencia resumida y ajustes.
 * Nunca incluye el carnet ni la cédula; el tipo y porcentaje de discapacidad solo si la persona lo autoriza.
 */
export function companyView(c: CompanyViewInput) {
  const educationLabel = c.education ? labelOf(EDUCATION_LEVELS, c.education) : null
  const summary = experienceSummary(c.experienceText, c.hasWorked)
  const showDisability = !c.shareOnlyAccommodations && c.disabilityType != null
  return {
    fullName: c.fullName,
    city: c.city,
    education: c.education,
    educationLabel,
    experienceSummary: summary,
    /** "Guayaquil · Bachillerato · 2 años en call center" */
    headline: [c.city, educationLabel, summary].filter(Boolean).join(' · '),
    accommodationsNeeded: c.accommodationsNeeded,
    otherAccommodation: c.otherAccommodation,
    /** "Carnet y diagnóstico ocultos" */
    idCardHidden: true as const,
    disabilityHidden: !showDisability,
    disability: showDisability ? { type: c.disabilityType!, percent: c.disabilityPercent ?? null } : null,
    // No aparecen en el mockup de la vista previa, pero la empresa los necesita para contactar (al postular)
    skills: c.skills,
    contact: c.phone ? { phone: c.phone, email: c.email ?? null, preferred: c.contactPreference ?? null } : null,
  }
}

export const companyViewDto = (c: Candidate) =>
  companyView({
    fullName: c.preferredName ?? c.fullName,
    city: c.city,
    phone: c.phone,
    email: c.email,
    contactPreference: c.contactPreference,
    education: c.education,
    hasWorked: c.hasWorked,
    experienceText: c.experienceText,
    skills: c.skills,
    accommodationsNeeded: c.accommodationsNeeded,
    otherAccommodation: c.otherAccommodation,
    shareOnlyAccommodations: c.shareOnlyAccommodations,
    disabilityType: c.disabilityType,
    disabilityPercent: c.disabilityPercent,
  })

/** Suma N días hábiles (lunes a viernes) en hora de Ecuador (UTC−5, sin horario de verano). Devuelve AAAA-MM-DD. */
export function addBusinessDays(from: Date, n: number) {
  const d = new Date(from.getTime() - 5 * 60 * 60 * 1000) // a hora de Ecuador
  let added = 0
  while (added < n) {
    d.setUTCDate(d.getUTCDate() + 1)
    const wd = d.getUTCDay()
    if (wd !== 0 && wd !== 6) added++
  }
  return d.toISOString().slice(0, 10)
}

const statusInfo = (s: Application['status']) => APPLICATION_STATUSES.find((x) => x.value === s)!

type ContactInfo = Pick<Candidate, 'contactPreference' | 'phone' | 'email'>

export function applicationDto(
  a: Application & { job: Job; events?: ApplicationEvent[] },
  contact?: ContactInfo,
  extra?: { similarCount?: number },
) {
  const info = statusInfo(a.status)
  return {
    id: a.id,
    status: a.status,
    statusLabel: info.label,
    /** Etapa 1 a 3 para la barra de progreso (Enviada · En revisión · Entrevista) */
    stage: info.stage,
    matchScore: a.matchScore,
    interview: a.interviewAt
      ? {
          at: a.interviewAt.toISOString(),
          mode: a.interviewMode,
          /** "Videollamada con intérprete si lo necesitas", dirección o enlace */
          place: a.interviewPlace,
          /** "Confirmar asistencia" */
          confirmedAt: a.interviewConfirmedAt?.toISOString() ?? null,
        }
      : null,
    /** Pantalla "Postulación enviada": la empresa revisa en 5 días hábiles y contacta por el medio preferido */
    ...(contact && {
      nextSteps: {
        reviewBusinessDays: REVIEW_BUSINESS_DAYS,
        reviewBy: addBusinessDays(a.createdAt, REVIEW_BUSINESS_DAYS),
        contactChannel: contact.contactPreference,
        contactValue: contact.contactPreference === 'email' ? contact.email : contact.phone,
      },
    }),
    /** Solo en "No seleccionada": cuántas ofertas parecidas hay (GET /api/applications/:id/similar) */
    ...(extra?.similarCount !== undefined && { similarCount: extra.similarCount }),
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
