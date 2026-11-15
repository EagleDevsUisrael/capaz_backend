/**
 * Catálogos compartidos con capaz_front (src/features/signup/options.ts).
 * Códigos en inglés (los usa el motor de match y la base); etiquetas en español (lo que ve la persona).
 * database/schema.sql genera sus CHECK de arrays a partir de estas listas: si cambias algo, regenera el SQL.
 */

const codes = <const T extends readonly { value: string }[]>(list: T) =>
  list.map((o) => o.value) as unknown as readonly [T[number]['value'], ...T[number]['value'][]]

export const DISABILITY_TYPES = [
  { value: 'physical', label: 'Física' },
  { value: 'visual', label: 'Visual' },
  { value: 'hearing', label: 'Auditiva' },
  { value: 'intellectual', label: 'Intelectual' },
  { value: 'psychosocial', label: 'Psicosocial' },
] as const
export const DISABILITY_TYPE_CODES = codes(DISABILITY_TYPES)
export type DisabilityType = (typeof DISABILITY_TYPE_CODES)[number]

export const CONTACT_PREFERENCES = [
  { value: 'call', label: 'Llamada' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'email', label: 'Correo' },
] as const
export const CONTACT_PREFERENCE_CODES = codes(CONTACT_PREFERENCES)

/** Ordenados de menor a mayor (el match compara el nivel mínimo). */
export const EDUCATION_LEVELS = [
  { value: 'primary', label: 'Primaria' },
  { value: 'highSchool', label: 'Bachillerato' },
  { value: 'technical', label: 'Técnico o tecnológico' },
  { value: 'university', label: 'Universidad' },
] as const
export const EDUCATION_LEVEL_CODES = codes(EDUCATION_LEVELS)
export type EducationLevel = (typeof EDUCATION_LEVEL_CODES)[number]

export const SKILLS = [
  { value: 'customerService', label: 'Atención al cliente' },
  { value: 'computing', label: 'Computación' },
  { value: 'excel', label: 'Excel' },
  { value: 'sales', label: 'Ventas' },
  { value: 'cooking', label: 'Cocina' },
  { value: 'crafts', label: 'Manualidades' },
  { value: 'english', label: 'Inglés' },
] as const
export const SKILL_CODES = codes(SKILLS)
export type Skill = (typeof SKILL_CODES)[number]

/** Ajustes: los marca la persona (accommodationsNeeded) y los ofrece la empresa (accommodationsOffered). */
export const ACCOMMODATIONS = [
  { value: 'seated', label: 'Trabajo sentado', offeredReason: 'Puedes trabajar sentado' },
  { value: 'ramp', label: 'Rampa o ascensor', offeredReason: 'Tiene rampa o ascensor' },
  { value: 'flexibleSchedule', label: 'Horario flexible', offeredReason: 'Te dan horario flexible' },
  { value: 'adaptedKeyboard', label: 'Teclado adaptado', offeredReason: 'Te dan el teclado adaptado que pediste' },
  { value: 'screenReader', label: 'Lector de pantalla', offeredReason: 'Tienen lector de pantalla' },
  { value: 'signLanguage', label: 'Intérprete de señas', offeredReason: 'Tienen intérprete de lengua de señas' },
] as const
export const ACCOMMODATION_CODES = codes(ACCOMMODATIONS)
export type Accommodation = (typeof ACCOMMODATION_CODES)[number]

/** Exigencias físicas del puesto (las marca el admin en la oferta). */
export const PHYSICAL_DEMANDS = [
  { value: 'bothHands', label: 'usar las dos manos' },
  { value: 'standing', label: 'estar de pie' },
  { value: 'walkingDriving', label: 'caminar o manejar' },
  { value: 'seeScreen', label: 'ver la pantalla' },
  { value: 'phoneSpeaking', label: 'hablar por teléfono' },
  { value: 'hearing', label: 'escuchar' },
] as const
export const PHYSICAL_DEMAND_CODES = codes(PHYSICAL_DEMANDS)
export type PhysicalDemand = (typeof PHYSICAL_DEMAND_CODES)[number]

export const JOB_MODALITIES = [
  { value: 'onSite', label: 'Presencial' },
  { value: 'remote', label: 'Teletrabajo' },
  { value: 'hybrid', label: 'Híbrido' },
] as const
export const JOB_MODALITY_CODES = codes(JOB_MODALITIES)

export const JOB_SCHEDULES = [
  { value: 'fullTime', label: 'Tiempo completo' },
  { value: 'partTime', label: 'Medio tiempo' },
] as const
export const JOB_SCHEDULE_CODES = codes(JOB_SCHEDULES)

export const APPLICATION_STATUSES = [
  { value: 'sent', label: 'Enviada', stage: 1 },
  { value: 'inReview', label: 'En revisión', stage: 2 },
  { value: 'interview', label: 'Entrevista', stage: 3 },
  { value: 'hired', label: 'Contratada', stage: 3 },
  { value: 'notSelected', label: 'No seleccionada', stage: 3 },
  { value: 'withdrawn', label: 'Retirada', stage: 1 },
] as const
export const APPLICATION_STATUS_CODES = codes(APPLICATION_STATUSES)
export type ApplicationStatus = (typeof APPLICATION_STATUS_CODES)[number]

/**
 * Ajuste que la persona necesita → exigencias del puesto con las que choca.
 * Si la oferta ofrece ese mismo ajuste, el choque se resuelve (p. ej. screenReader vs seeScreen).
 * Excepción: "seated" no se resuelve, porque un puesto que exige estar de pie o manejar no cambia.
 * TODO(equipo): validar esta tabla con personas con discapacidad y con empresas.
 */
export const CLASHES: Partial<Record<Accommodation, readonly PhysicalDemand[]>> = {
  seated: ['standing', 'walkingDriving'],
  screenReader: ['seeScreen'],
  signLanguage: ['phoneSpeaking', 'hearing'],
  adaptedKeyboard: ['bothHands'],
}
export const CLASH_RESOLVED_IF_OFFERED: readonly Accommodation[] = ['screenReader', 'signLanguage', 'adaptedKeyboard']

export const labelOf = (list: readonly { value: string; label: string }[], value: string | null | undefined) =>
  list.find((o) => o.value === value)?.label ?? value ?? ''

/** Todo el catálogo, para GET /api/catalog (el front puede leer las listas de aquí). */
export const CATALOG = {
  disabilityTypes: DISABILITY_TYPES,
  contactPreferences: CONTACT_PREFERENCES,
  educationLevels: EDUCATION_LEVELS,
  skills: SKILLS,
  accommodations: ACCOMMODATIONS.map(({ value, label }) => ({ value, label })),
  physicalDemands: PHYSICAL_DEMANDS,
  jobModalities: JOB_MODALITIES,
  jobSchedules: JOB_SCHEDULES,
  applicationStatuses: APPLICATION_STATUSES,
}
