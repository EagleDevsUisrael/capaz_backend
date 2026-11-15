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

/**
 * Exigencias físicas del puesto (las marca el admin en la oferta: "Lo que exige el puesto").
 * `label` es el texto del mockup; `phrase` completa la frase "El puesto exige …".
 */
export const PHYSICAL_DEMANDS = [
  { value: 'bothHands', label: 'Usar ambas manos', phrase: 'usar ambas manos' },
  { value: 'standing', label: 'Estar de pie', phrase: 'estar de pie' },
  { value: 'walkingDriving', label: 'Caminar / conducir', phrase: 'caminar o conducir' },
  { value: 'seeScreen', label: 'Ver pantalla', phrase: 'ver la pantalla' },
  { value: 'phoneSpeaking', label: 'Hablar por teléfono', phrase: 'hablar por teléfono' },
  { value: 'hearing', label: 'Oír', phrase: 'oír' },
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
  { value: 'internship', label: 'Pasantía' },
] as const
export const JOB_SCHEDULE_CODES = codes(JOB_SCHEDULES)

/** Las 24 provincias del Ecuador (para el conteo "N provincias" del inicio). */
export const PROVINCES = [
  { value: 'azuay', label: 'Azuay' },
  { value: 'bolivar', label: 'Bolívar' },
  { value: 'canar', label: 'Cañar' },
  { value: 'carchi', label: 'Carchi' },
  { value: 'chimborazo', label: 'Chimborazo' },
  { value: 'cotopaxi', label: 'Cotopaxi' },
  { value: 'elOro', label: 'El Oro' },
  { value: 'esmeraldas', label: 'Esmeraldas' },
  { value: 'galapagos', label: 'Galápagos' },
  { value: 'guayas', label: 'Guayas' },
  { value: 'imbabura', label: 'Imbabura' },
  { value: 'loja', label: 'Loja' },
  { value: 'losRios', label: 'Los Ríos' },
  { value: 'manabi', label: 'Manabí' },
  { value: 'moronaSantiago', label: 'Morona Santiago' },
  { value: 'napo', label: 'Napo' },
  { value: 'orellana', label: 'Orellana' },
  { value: 'pastaza', label: 'Pastaza' },
  { value: 'pichincha', label: 'Pichincha' },
  { value: 'santaElena', label: 'Santa Elena' },
  { value: 'santoDomingo', label: 'Santo Domingo de los Tsáchilas' },
  { value: 'sucumbios', label: 'Sucumbíos' },
  { value: 'tungurahua', label: 'Tungurahua' },
  { value: 'zamoraChinchipe', label: 'Zamora Chinchipe' },
] as const
export const PROVINCE_CODES = codes(PROVINCES)

/**
 * Filtros "Accesibilidad del puesto" del inicio. Cada uno se traduce a una condición sobre la oferta.
 * (Son atajos para el front; el filtro `accommodations` sigue aceptando cualquier ajuste.)
 */
export const JOB_FEATURES = [
  { value: 'remote', label: 'Teletrabajo desde casa' },
  { value: 'wheelchair', label: 'Acceso en silla de ruedas', accommodation: 'ramp' },
  { value: 'screenReader', label: 'Compatible con lector de pantalla', accommodation: 'screenReader' },
  { value: 'signLanguage', label: 'Equipo con lengua de señas', accommodation: 'signLanguage' },
  { value: 'flexibleSchedule', label: 'Horario flexible', accommodation: 'flexibleSchedule' },
] as const
export const JOB_FEATURE_CODES = codes(JOB_FEATURES)
export type JobFeature = (typeof JOB_FEATURE_CODES)[number]

/** Rangos de "Salario mensual" (USD). `max: null` = sin tope. */
export const SALARY_RANGES = [
  { value: '470-600', label: '$470 – $600', min: 470, max: 600 },
  { value: '600-900', label: '$600 – $900', min: 600, max: 900 },
  { value: '900+', label: 'Más de $900', min: 900, max: null },
] as const
export const SALARY_RANGE_CODES = codes(SALARY_RANGES)
export type SalaryRange = (typeof SALARY_RANGE_CODES)[number]

export const INTERVIEW_MODES = [
  { value: 'inPerson', label: 'Presencial' },
  { value: 'videoCall', label: 'Videollamada' },
  { value: 'phoneCall', label: 'Llamada telefónica' },
] as const
export const INTERVIEW_MODE_CODES = codes(INTERVIEW_MODES)

/** "La empresa revisa tu perfil en los próximos N días hábiles" (pantalla Postulación enviada). */
export const REVIEW_BUSINESS_DAYS = 5

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
  seated: ['walkingDriving', 'standing'],
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
  jobFeatures: JOB_FEATURES.map(({ value, label }) => ({ value, label })),
  salaryRanges: SALARY_RANGES,
  provinces: PROVINCES,
  interviewModes: INTERVIEW_MODES,
  applicationStatuses: APPLICATION_STATUSES,
}
