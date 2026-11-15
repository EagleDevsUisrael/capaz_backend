/**
 * Motor de match (documento, sección "Motor de match de la IA").
 *
 * Etapa 1: reglas que descartan (0 %): discapacidad no compatible o un ajuste que choca con una exigencia.
 * Etapa 2: puntaje de 0 a 100 con razones en lenguaje sencillo:
 *   discapacidad compatible 40 · ajustes cubiertos 30 · experiencia 25 · estudios 5.
 * Se recomiendan las ofertas con 70 o más.
 *
 * Solo reglas, sin modelo de lenguaje: un modelo podría sumarse después para comparar la experiencia
 * escrita y redactar razones, pero nunca para descartar ofertas.
 */
import {
  ACCOMMODATIONS,
  CLASH_RESOLVED_IF_OFFERED,
  CLASHES,
  DISABILITY_TYPES,
  EDUCATION_LEVEL_CODES,
  EDUCATION_LEVELS,
  labelOf,
  PHYSICAL_DEMANDS,
  type Accommodation,
  type EducationLevel,
  type PhysicalDemand,
} from './catalog.js'

export const RECOMMEND_THRESHOLD = 70
export const WEIGHTS = { disability: 40, accommodations: 30, experience: 25, education: 5 } as const

export interface MatchCandidate {
  disabilityType: string
  disabilityPercent: number
  city?: string | null
  experienceText?: string | null
  education?: string | null
  skills: string[]
  accommodationsNeeded: string[]
  otherAccommodation?: string | null
}

export interface MatchJob {
  id: string
  title: string
  city: string
  modality: string
  compatibleDisabilities: string[]
  physicalDemands: string[]
  accommodationsOffered: string[]
  keywords: string[]
  minEducation?: string | null
}

export interface Match {
  jobId: string
  /** 0 a 100 */
  score: number
  recommended: boolean
  rejected: boolean
  /** Por qué se descartó (solo si rejected) */
  rejectReason: string | null
  /** "Por qué encaja contigo" */
  reasons: string[]
  /** Avisos: lo que falta o conviene preguntar */
  warnings: string[]
  breakdown: { disability: number; accommodations: number; experience: number; education: number }
}

/** Palabras con las que se reconoce cada habilidad en las palabras clave de la oferta. */
const SKILL_TERMS: Record<string, string[]> = {
  customerService: ['atencion', 'cliente', 'clientes', 'servicio', 'callcenter'],
  computing: ['computacion', 'computadora', 'informatica', 'ofimatica', 'digitacion'],
  excel: ['excel', 'hojas', 'calculo'],
  sales: ['ventas', 'vendedor', 'vendedora', 'comercial'],
  cooking: ['cocina', 'cocinero', 'cocinera', 'alimentos', 'gastronomia'],
  crafts: ['manualidades', 'artesania', 'empaque', 'ensamblaje'],
  english: ['ingles', 'english', 'bilingue'],
}

const normalize = (s: string) =>
  s
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()

const tokenize = (s: string) => normalize(s).split(/[^a-z0-9]+/).filter((t) => t.length >= 3)

/** Igual, o comparten una raíz de 6 letras o más ("programación" ~ "programador"). */
function sameWord(a: string, b: string) {
  if (a === b) return true
  let i = 0
  while (i < a.length && i < b.length && a[i] === b[i]) i++
  return i >= 6
}

const reject = (jobId: string, reason: string): Match => ({
  jobId,
  score: 0,
  recommended: false,
  rejected: true,
  rejectReason: reason,
  reasons: [],
  warnings: [],
  breakdown: { disability: 0, accommodations: 0, experience: 0, education: 0 },
})

const demandLabel = (d: string) => labelOf(PHYSICAL_DEMANDS, d)
const accommodation = (a: string) => ACCOMMODATIONS.find((o) => o.value === a)

/** Primer ajuste necesario que choca con una exigencia del puesto, o null. */
export function findClash(needed: string[], job: Pick<MatchJob, 'physicalDemands' | 'accommodationsOffered'>) {
  for (const a of needed) {
    const demands = CLASHES[a as Accommodation]
    if (!demands) continue
    if (CLASH_RESOLVED_IF_OFFERED.includes(a as Accommodation) && job.accommodationsOffered.includes(a)) continue
    const demand = demands.find((d) => job.physicalDemands.includes(d))
    if (demand) return { accommodation: a, demand: demand as PhysicalDemand }
  }
  return null
}

export function scoreJob(c: MatchCandidate, j: MatchJob): Match {
  // ── Etapa 1: reglas que descartan ──
  if (!j.compatibleDisabilities.includes(c.disabilityType)) {
    return reject(j.id, 'Tipo de discapacidad no compatible')
  }
  const clash = findClash(c.accommodationsNeeded, j)
  if (clash) return reject(j.id, `El puesto exige ${demandLabel(clash.demand)}`)

  const reasons: string[] = []
  const warnings: string[] = []

  // ── Etapa 2: puntaje ──
  // Discapacidad compatible (40, fijo)
  const disability = WEIGHTS.disability
  reasons.push(
    `Acepta personas con discapacidad ${labelOf(DISABILITY_TYPES, c.disabilityType).toLowerCase()}`,
  )

  // Ajustes cubiertos (30)
  let accommodations: number
  const needed = c.accommodationsNeeded.filter((a) => accommodation(a))
  if (needed.length === 0) {
    accommodations = Math.round(WEIGHTS.accommodations / 2)
    warnings.push('Cuéntanos qué ajustes necesitas: así te recomendamos mejor')
  } else {
    const covered = needed.filter((a) => j.accommodationsOffered.includes(a))
    accommodations = Math.round((WEIGHTS.accommodations * covered.length) / needed.length)
    for (const a of covered) reasons.push(accommodation(a)!.offeredReason)
    for (const a of needed.filter((x) => !covered.includes(x))) {
      warnings.push(`No dice si tiene ${accommodation(a)!.label.toLowerCase()}: pregúntalo antes de postular`)
    }
  }
  if (c.otherAccommodation?.trim()) {
    warnings.push(`Pregunta si pueden darte: ${c.otherAccommodation.trim()}`)
  }

  // Experiencia (25): habilidades y palabras de experienceText contra keywords
  let experience = 0
  const keywords = [...new Set(j.keywords.map(normalize).map((k) => k.trim()).filter(Boolean))]
  if (keywords.length > 0) {
    const terms = new Set<string>(tokenize(c.experienceText ?? ''))
    for (const s of c.skills) for (const t of SKILL_TERMS[s] ?? [normalize(s)]) terms.add(t)
    const matched = keywords.filter((k) => {
      const kTokens = tokenize(k)
      return kTokens.length > 0 && kTokens.every((kt) => [...terms].some((t) => sameWord(t, kt)))
    })
    const needed = Math.min(keywords.length, 4)
    experience = Math.round(WEIGHTS.experience * Math.min(1, matched.length / needed))
    if (matched.length > 0) {
      reasons.push(`Tu experiencia coincide con lo que buscan: ${matched.slice(0, 3).join(', ')}`)
    } else if (!c.experienceText?.trim() && c.skills.length === 0) {
      warnings.push('Cuéntanos tu experiencia para saber si el puesto encaja contigo')
    }
  }

  // Estudios (5)
  let education = 0
  const rank = (e: string | null | undefined) => (e ? EDUCATION_LEVEL_CODES.indexOf(e as EducationLevel) : -1)
  if (!j.minEducation) {
    education = WEIGHTS.education
  } else if (rank(c.education) >= rank(j.minEducation)) {
    education = WEIGHTS.education
    reasons.push('Cumples los estudios que piden')
  } else {
    warnings.push(`Piden ${labelOf(EDUCATION_LEVELS, j.minEducation).toLowerCase()} como mínimo`)
  }

  // Ubicación: solo aviso, no resta puntos
  if (j.modality !== 'remote' && c.city && normalize(c.city).trim() !== normalize(j.city).trim()) {
    warnings.push(
      j.modality === 'onSite'
        ? `Queda en ${j.city}: pregunta si acepta trabajo 100 % remoto`
        : `Es híbrido en ${j.city}: pregunta cuántos días hay que ir`,
    )
  }

  const score = Math.min(100, disability + accommodations + experience + education)
  return {
    jobId: j.id,
    score,
    recommended: score >= RECOMMEND_THRESHOLD,
    rejected: false,
    rejectReason: null,
    reasons,
    warnings,
    breakdown: { disability, accommodations, experience, education },
  }
}

/** Puntúa y ordena: primero las de mayor puntaje; las descartadas al final. */
export function rankJobs(c: MatchCandidate, jobs: MatchJob[]): Match[] {
  return jobs.map((j) => scoreJob(c, j)).sort((a, b) => b.score - a.score)
}
