/** Esquemas zod compartidos por las rutas (validan la entrada y documentan la API en /docs). */
import { z } from 'zod'
import { Prisma } from '../generated/prisma/client.js'
import {
  ACCOMMODATION_CODES,
  CONTACT_PREFERENCE_CODES,
  DISABILITY_TYPE_CODES,
  EDUCATION_LEVEL_CODES,
  INTERVIEW_MODE_CODES,
  JOB_FEATURE_CODES,
  JOB_MODALITY_CODES,
  JOB_SCHEDULE_CODES,
  PHYSICAL_DEMAND_CODES,
  PROVINCE_CODES,
  SALARY_RANGE_CODES,
  SKILL_CODES,
} from '../domain/catalog.js'
import { isValidCedula } from '../domain/cedula.js'

export const uuid = z.uuid({ error: 'Identificador inválido' })
export const idParam = z.object({ id: uuid })

export const cedula = z
  .string()
  .trim()
  .refine(isValidCedula, { error: 'La cédula no es válida. Revisa los 10 dígitos.' })

/** AAAA-MM-DD */
export const isoDate = z.iso.date({ error: 'Usa el formato AAAA-MM-DD' })

const uniq = <T extends z.ZodType>(item: T, max = 20) =>
  z
    .array(item)
    .max(max)
    .transform((a) => [...new Set(a)] as z.output<T>[])

export const disabilityType = z.enum(DISABILITY_TYPE_CODES)
export const educationLevel = z.enum(EDUCATION_LEVEL_CODES)
export const skills = uniq(z.enum(SKILL_CODES))
export const accommodation = z.enum(ACCOMMODATION_CODES)
export const accommodations = uniq(accommodation)
export const physicalDemands = uniq(z.enum(PHYSICAL_DEMAND_CODES))
export const disabilityTypes = uniq(z.enum(DISABILITY_TYPE_CODES))
export const jobModality = z.enum(JOB_MODALITY_CODES)
export const jobSchedule = z.enum(JOB_SCHEDULE_CODES)
export const jobFeature = z.enum(JOB_FEATURE_CODES)
export const salaryRange = z.enum(SALARY_RANGE_CODES)
export const province = z.enum(PROVINCE_CODES)
export const interviewMode = z.enum(INTERVIEW_MODE_CODES)

/** Vigencia del carnet: fecha, "indefinite" (el carnet dice "Indefinida") o null (no se leyó). */
export const validity = z.union([isoDate, z.literal('indefinite')]).nullable()

/** Paso 1 confirmado por la persona (puede corregir lo que leyó el OCR). */
export const idCardData = z.object({
  fullName: z.string().trim().min(3).max(120),
  idNumber: cedula,
  birthDate: isoDate.nullable(),
  disabilityType,
  disabilityPercent: z.number().int().min(1).max(100),
  validity,
})

/** Celular ecuatoriano: 09 + 8 dígitos */
export const phone = z.string().regex(/^09\d{8}$/, { error: 'Escribe 10 dígitos que empiecen con 09' })

/** Paso 2 (mismas reglas que ContactStep.tsx del front). */
export const contactData = z.object({
  fullName: z.string().trim().min(3, { error: 'Escribe tu nombre completo' }).max(120),
  phone,
  email: z.email({ error: 'Escribe un correo válido, por ejemplo nombre@correo.com' }).max(160),
  city: z.string().trim().min(2, { error: 'Escribe la ciudad donde vives' }).max(80),
  preferred: z.enum(CONTACT_PREFERENCE_CODES),
})

/** Paso 3 (opcional; mismo formato que useSignupStore del front). */
export const experienceData = z.object({
  hasWorked: z.enum(['yes', 'no']).nullable().default(null),
  experienceText: z.string().max(4000).default(''),
  cvFileName: z.string().max(200).default(''),
  education: educationLevel.nullable().default(null),
  skills: skills.default([]),
  accommodationsNeeded: accommodations.default([]),
  otherAccommodation: z.string().max(500).default(''),
})

/** Paso 4. */
export const privacyData = z.object({
  /** Obligatorio para usar Capaz */
  useProfile: z.literal(true, { error: 'Para usar Capaz tienes que aceptar el uso de tu perfil' }),
  shareOnlyAccommodations: z.boolean(),
  discoverable: z.boolean(),
})

/** Lectura fácil por secciones (pantalla "Detalle de oferta (Lectura fácil)"): frases cortas, una idea por línea. */
const easyLines = z.array(z.string().trim().min(1).max(120)).max(8).default([])
export const easyRead = z.object({
  /** "Trabajo: atender llamadas" */
  jobTitle: z.string().trim().min(1).max(80),
  whatYouDo: easyLines,
  whereAndWhen: easyLines,
  pay: easyLines,
  whatYouGet: easyLines,
  whatYouNeed: easyLines,
})

export const jobInput = z
  .object({
    title: z.string().trim().min(3).max(120),
    company: z.string().trim().min(2).max(120),
    city: z.string().trim().min(2).max(80),
    modality: jobModality,
    schedule: jobSchedule,
    salaryMin: z.number().int().nonnegative().nullable().default(null),
    salaryMax: z.number().int().nonnegative().nullable().default(null),
    /** null = todo el país (teletrabajo) */
    province: province.nullable().default(null),
    /** Horas por día ("8 h") */
    dailyHours: z.number().int().min(1).max(24).nullable().default(null),
    /** Texto corto de la tarjeta de la lista */
    summary: z.string().max(300).default(''),
    /** "Qué harás" */
    description: z.string().max(4000).default(''),
    /** "Qué necesitas" */
    requirements: z.array(z.string().trim().min(1).max(300)).max(20).default([]),
    /** "Ajustes que ofrece la empresa" en detalle */
    accommodationsDetail: z.array(z.string().trim().min(1).max(300)).max(20).default([]),
    /** "Salario y beneficios" */
    salaryBenefits: z.string().max(1000).default(''),
    easyRead: easyRead.nullable().default(null),
    compatibleDisabilities: disabilityTypes.refine((a) => a.length > 0, {
      error: 'Marca al menos un tipo de discapacidad compatible',
    }),
    physicalDemands: physicalDemands.default([]),
    accommodationsOffered: accommodations.default([]),
    keywords: z.array(z.string().trim().toLowerCase().min(2).max(40)).max(30).default([]),
    minEducation: educationLevel.nullable().default(null),
    isActive: z.boolean().default(true),
  })
  .refine((j) => j.salaryMin == null || j.salaryMax == null || j.salaryMin <= j.salaryMax, {
    error: 'El salario mínimo no puede ser mayor que el máximo',
    path: ['salaryMin'],
  })

export type JobInput = z.output<typeof jobInput>

/** Para Prisma: un JSON null se guarda como NULL de SQL. */
export const toJobData = (j: JobInput) => ({ ...j, easyRead: j.easyRead ?? Prisma.DbNull })

/** "a,b,c" o ["a","b"] en la query → array */
export const csv = <T extends z.ZodType>(item: T) =>
  z.preprocess(
    (v) => (typeof v === 'string' ? v.split(',').map((s) => s.trim()).filter(Boolean) : v),
    z.array(item),
  )
