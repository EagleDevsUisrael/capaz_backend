/**
 * Datos de prueba para el admin de demostración y el seed.
 * Ninguna empresa ni persona es real.
 */
import { withCheckDigit } from '../domain/cedula.js'
import type { MatchCandidate } from '../domain/matchEngine.js'
import type { JobInput } from '../modules/schemas.js'

type Template = Omit<JobInput, 'isActive' | 'company' | 'city'> & { companies: string[]; cities: string[] }

const T = (t: Template) => t

export const JOB_TEMPLATES: Template[] = [
  T({
    title: 'Desarrollador backend',
    companies: ['Andes Software', 'Pacífico Tech'],
    cities: ['Quito', 'Guayaquil'],
    modality: 'remote',
    schedule: 'fullTime',
    salaryMin: 1200,
    salaryMax: 1800,
    description: 'Construir y mantener servicios web para una plataforma de pagos.',
    tasks: ['Programar servicios en Node.js', 'Revisar código del equipo', 'Atender incidencias de producción'],
    requirements: ['Experiencia con Node.js o similar', 'Conocimientos de bases de datos'],
    easyReadSummary: 'Vas a hacer programas para computadora.\nTrabajas desde tu casa.\nTe dan un teclado adaptado si lo necesitas.',
    compatibleDisabilities: ['physical', 'hearing', 'visual', 'psychosocial'],
    physicalDemands: [],
    accommodationsOffered: ['seated', 'adaptedKeyboard', 'flexibleSchedule', 'screenReader'],
    keywords: ['desarrollador', 'programacion', 'node', 'backend'],
    minEducation: 'technical',
  }),
  T({
    title: 'Conductor profesional',
    companies: ['Transportes del Austro', 'Logística Sierra'],
    cities: ['Cuenca', 'Quito'],
    modality: 'onSite',
    schedule: 'fullTime',
    salaryMin: 600,
    salaryMax: 750,
    description: 'Reparto de mercadería en la ciudad.',
    tasks: ['Manejar el camión de reparto', 'Cargar y entregar paquetes'],
    requirements: ['Licencia tipo C'],
    easyReadSummary: 'Vas a manejar un camión.\nLlevas paquetes a las tiendas.',
    compatibleDisabilities: ['physical', 'hearing', 'psychosocial'],
    physicalDemands: ['walkingDriving', 'standing', 'bothHands'],
    accommodationsOffered: ['flexibleSchedule'],
    keywords: ['conductor', 'chofer', 'reparto'],
    minEducation: 'highSchool',
  }),
  T({
    title: 'Agente de atención telefónica',
    companies: ['Banco del Litoral', 'Conecta Call Center'],
    cities: ['Guayaquil', 'Quito'],
    modality: 'remote',
    schedule: 'partTime',
    salaryMin: 470,
    salaryMax: 600,
    description: 'Responder llamadas de clientes y resolver sus dudas.',
    tasks: ['Contestar llamadas', 'Registrar los casos en el sistema'],
    requirements: ['Buena comunicación', 'Manejo básico de computadora'],
    easyReadSummary: 'Vas a contestar el teléfono.\nAyudas a las personas con sus preguntas.\nTrabajas desde tu casa.',
    compatibleDisabilities: ['physical', 'visual', 'psychosocial'],
    physicalDemands: ['phoneSpeaking', 'hearing'],
    accommodationsOffered: ['seated', 'screenReader', 'flexibleSchedule'],
    keywords: ['atencion', 'cliente', 'telefono', 'computacion'],
    minEducation: 'highSchool',
  }),
  T({
    title: 'Auxiliar de digitación',
    companies: ['Seguros Equinoccio', 'Clínica San Gabriel'],
    cities: ['Quito', 'Ambato'],
    modality: 'onSite',
    schedule: 'fullTime',
    salaryMin: 470,
    salaryMax: 520,
    description: 'Ingresar datos de formularios al sistema.',
    tasks: ['Digitar formularios', 'Revisar que los datos estén completos'],
    requirements: ['Manejo de Excel'],
    easyReadSummary: 'Vas a escribir datos en la computadora.\nTrabajas sentado.',
    compatibleDisabilities: ['physical', 'hearing', 'intellectual', 'psychosocial'],
    physicalDemands: ['seeScreen', 'bothHands'],
    accommodationsOffered: ['seated', 'ramp', 'adaptedKeyboard', 'signLanguage'],
    keywords: ['digitacion', 'excel', 'computacion'],
    minEducation: 'highSchool',
  }),
  T({
    title: 'Ayudante de cocina',
    companies: ['Restaurante La Huerta', 'Cafetería Central'],
    cities: ['Cuenca', 'Loja'],
    modality: 'onSite',
    schedule: 'partTime',
    salaryMin: 470,
    salaryMax: 470,
    description: 'Apoyar en la preparación de alimentos.',
    tasks: ['Lavar y picar ingredientes', 'Mantener limpia la cocina'],
    requirements: [],
    easyReadSummary: 'Vas a ayudar en la cocina.\nLavas y cortas verduras.',
    compatibleDisabilities: ['hearing', 'intellectual', 'psychosocial'],
    physicalDemands: ['standing', 'bothHands'],
    accommodationsOffered: ['signLanguage', 'flexibleSchedule'],
    keywords: ['cocina', 'alimentos'],
    minEducation: null,
  }),
  T({
    title: 'Asesor de ventas',
    companies: ['Tienda Mitad del Mundo', 'Electro Hogar'],
    cities: ['Guayaquil', 'Manta'],
    modality: 'hybrid',
    schedule: 'fullTime',
    salaryMin: 500,
    salaryMax: 800,
    description: 'Atender a clientes en tienda y por WhatsApp.',
    tasks: ['Asesorar a clientes', 'Registrar ventas'],
    requirements: ['Experiencia en ventas'],
    easyReadSummary: 'Vas a vender productos.\nAtiendes a clientes en la tienda y por WhatsApp.',
    compatibleDisabilities: ['physical', 'hearing', 'psychosocial'],
    physicalDemands: ['phoneSpeaking'],
    accommodationsOffered: ['seated', 'ramp'],
    keywords: ['ventas', 'cliente'],
    minEducation: 'highSchool',
  }),
  T({
    title: 'Empacador de productos',
    companies: ['Artesanías Otavalo', 'Distribuidora Andina'],
    cities: ['Ibarra', 'Quito'],
    modality: 'onSite',
    schedule: 'fullTime',
    salaryMin: 470,
    salaryMax: 500,
    description: 'Empacar productos para envío.',
    tasks: ['Empacar productos', 'Etiquetar cajas'],
    requirements: [],
    easyReadSummary: 'Vas a poner productos en cajas.\nPegas etiquetas.',
    compatibleDisabilities: ['hearing', 'intellectual', 'physical', 'psychosocial'],
    physicalDemands: ['bothHands'],
    accommodationsOffered: ['seated', 'flexibleSchedule', 'signLanguage', 'ramp'],
    keywords: ['empaque', 'manualidades'],
    minEducation: null,
  }),
  T({
    title: 'Tutor de inglés en línea',
    companies: ['Aprende Ya', 'English Ecuador'],
    cities: ['Quito'],
    modality: 'remote',
    schedule: 'partTime',
    salaryMin: 400,
    salaryMax: 700,
    description: 'Clases de inglés por videollamada.',
    tasks: ['Dar clases por videollamada', 'Corregir tareas'],
    requirements: ['Inglés avanzado'],
    easyReadSummary: 'Vas a enseñar inglés por internet.\nTrabajas desde tu casa.',
    compatibleDisabilities: ['physical', 'visual', 'psychosocial'],
    physicalDemands: ['phoneSpeaking', 'hearing'],
    accommodationsOffered: ['seated', 'flexibleSchedule', 'screenReader'],
    keywords: ['ingles', 'docente'],
    minEducation: 'university',
  }),
]

const pick = <T>(a: readonly T[]) => a[Math.floor(Math.random() * a.length)]!

/** Ofertas fijas del seed: una por plantilla, con la primera empresa y ciudad. */
export const SEED_JOBS: JobInput[] = JOB_TEMPLATES.map(({ companies, cities, ...t }) => ({
  ...t,
  company: companies[0]!,
  city: cities[0]!,
  isActive: true,
}))

/** "Generar N ofertas al azar" */
export function randomJobs(n: number): JobInput[] {
  return Array.from({ length: n }, () => {
    const { companies, cities, ...t } = pick(JOB_TEMPLATES)
    const bump = Math.round(Math.random() * 4) * 25
    return {
      ...t,
      company: pick(companies),
      city: pick(cities),
      salaryMin: t.salaryMin == null ? null : t.salaryMin + bump,
      salaryMax: t.salaryMax == null ? null : t.salaryMax + bump,
      isActive: true,
    }
  })
}

/** Ejemplo del documento: desarrollador con discapacidad física del 70 % que marcó "seated". */
export const DEMO_CANDIDATE: MatchCandidate = {
  disabilityType: 'physical',
  disabilityPercent: 70,
  city: 'Quito',
  experienceText: 'Desarrollador, 5 años de experiencia en programación con Node',
  education: 'university',
  skills: ['computing'],
  accommodationsNeeded: ['seated'],
  otherAccommodation: '',
}

const FIRST = ['María', 'José', 'Ana', 'Luis', 'Carmen', 'Jorge', 'Rosa', 'Diego', 'Paola', 'Andrés']
const LAST = ['Torres', 'Quishpe', 'Mendoza', 'Vera', 'Guamán', 'Zambrano', 'Paredes', 'Chávez', 'Andrade', 'Cedeño']
const CITIES = ['Quito', 'Guayaquil', 'Cuenca', 'Ambato', 'Loja', 'Manta', 'Ibarra']
const TYPES = ['physical', 'visual', 'hearing', 'intellectual', 'psychosocial'] as const
const ACC = ['seated', 'ramp', 'flexibleSchedule', 'adaptedKeyboard', 'screenReader', 'signLanguage'] as const
const SK = ['customerService', 'computing', 'excel', 'sales', 'cooking', 'crafts', 'english'] as const
const EDU = ['primary', 'highSchool', 'technical', 'university'] as const

const sample = <T>(a: readonly T[], max: number) =>
  [...a].sort(() => Math.random() - 0.5).slice(0, Math.floor(Math.random() * (max + 1)))

/** Candidatos de prueba (pestaña "Candidatos de prueba" del admin). Cédulas válidas pero inventadas. */
export function randomCandidates(n: number) {
  return Array.from({ length: n }, () => {
    const first = pick(FIRST)
    const last = `${pick(LAST)} ${pick(LAST)}`
    const province = String(1 + Math.floor(Math.random() * 24)).padStart(2, '0')
    const nine = province + String(Math.floor(Math.random() * 6)) + String(Math.floor(Math.random() * 1e6)).padStart(6, '0')
    const disabilityType = pick(TYPES)
    return {
      idNumber: withCheckDigit(nine),
      fullName: `${first} ${last}`,
      disabilityType,
      disabilityPercent: 30 + Math.floor(Math.random() * 60),
      phone: '09' + String(Math.floor(Math.random() * 1e8)).padStart(8, '0'),
      email: `${first}.${last.split(' ')[0]}`.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '') + '@ejemplo.ec',
      city: pick(CITIES),
      experienceText: '',
      education: pick(EDU),
      skills: sample(SK, 3),
      accommodationsNeeded: sample(ACC, 2),
      isTest: true,
      phoneVerifiedAt: new Date(),
      consentAt: new Date(),
    }
  })
}
