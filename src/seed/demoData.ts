/**
 * Datos de prueba para el admin de demostración y el seed.
 * Ninguna empresa ni persona es real. Las ofertas siguen los ejemplos de los mockups.
 */
import type { PROVINCE_CODES } from '../domain/catalog.js'
import { withCheckDigit } from '../domain/cedula.js'
import type { MatchCandidate } from '../domain/matchEngine.js'
import type { JobInput } from '../modules/schemas.js'

type Province = (typeof PROVINCE_CODES)[number]
type Place = { city: string; province: Province | null }
type Template = Omit<JobInput, 'isActive' | 'company' | 'city' | 'province'> & {
  companies: string[]
  places: Place[]
}

const T = (t: Template) => t
const P = (city: string, province: Province | null): Place => ({ city, province })
const QUITO = P('Quito', 'pichincha')
const GYE = P('Guayaquil', 'guayas')
const CUENCA = P('Cuenca', 'azuay')
const PAIS = P('Todo el país', null)

export const JOB_TEMPLATES: Template[] = [
  T({
    title: 'Desarrollador backend',
    companies: ['Andes Tech', 'Pacífico Software'],
    places: [QUITO, GYE],
    modality: 'remote',
    schedule: 'fullTime',
    dailyHours: 8,
    salaryMin: 1200,
    salaryMax: 1800,
    summary: 'Desarrollas APIs en Node.js desde tu casa. Te damos teclado adaptado si lo necesitas.',
    description: 'Desarrollo de APIs en Node.js para una plataforma de pagos. Revisas código del equipo y atiendes incidencias.',
    requirements: ['Experiencia con Node.js o similar', 'Conocimientos de bases de datos'],
    accommodationsDetail: ['Teclado adaptado y mouse vertical', 'Lector de pantalla NVDA', 'Horario flexible con metas semanales'],
    salaryBenefits: 'Entre $1.200 y $1.800 al mes, beneficios de ley e IESS desde el primer día.',
    easyRead: {
      jobTitle: 'Trabajo: hacer programas',
      whatYouDo: ['Haces programas para computadora.'],
      whereAndWhen: ['Trabajas desde tu casa.', 'De lunes a viernes.', '8 horas cada día.'],
      pay: ['Desde 1.200 dólares cada mes.'],
      whatYouGet: ['Un teclado especial si lo necesitas.'],
      whatYouNeed: ['Saber programar.'],
    },
    compatibleDisabilities: ['physical', 'hearing', 'visual', 'psychosocial'],
    physicalDemands: [],
    accommodationsOffered: ['seated', 'adaptedKeyboard', 'flexibleSchedule', 'screenReader'],
    keywords: ['desarrollador', 'programacion', 'node', 'backend'],
    minEducation: 'technical',
  }),
  T({
    title: 'Conductor profesional',
    companies: ['TransAndes', 'Logística Sierra'],
    places: [CUENCA, QUITO],
    modality: 'onSite',
    schedule: 'fullTime',
    dailyHours: 8,
    salaryMin: 600,
    salaryMax: 750,
    summary: 'Repartes mercadería en la ciudad con el camión de la empresa.',
    description: 'Manejas el camión de reparto, cargas y entregas paquetes en tiendas de la ciudad.',
    requirements: ['Licencia tipo C'],
    accommodationsDetail: ['Horario flexible para citas médicas'],
    salaryBenefits: 'Entre $600 y $750 al mes y beneficios de ley.',
    easyRead: null,
    compatibleDisabilities: ['physical', 'hearing', 'psychosocial'],
    physicalDemands: ['walkingDriving', 'standing', 'bothHands'],
    accommodationsOffered: ['flexibleSchedule'],
    keywords: ['conductor', 'chofer', 'reparto'],
    minEducation: 'highSchool',
  }),
  T({
    title: 'Agente de atención telefónica',
    companies: ['Banco del Litoral', 'Conecta Call Center'],
    places: [GYE, QUITO],
    modality: 'remote',
    schedule: 'fullTime',
    dailyHours: 8,
    salaryMin: 520,
    salaryMax: 520,
    summary: 'Atiendes llamadas de clientes desde tu casa. Te damos computadora con lector de pantalla y auriculares.',
    description:
      'Atenderás llamadas de clientes para resolver dudas sobre tarjetas y cuentas. Registrarás cada caso en el sistema. Turnos de 8 horas, de lunes a viernes.',
    requirements: ['Bachillerato completo', 'Buena comunicación oral', 'No necesitas experiencia: te capacitamos'],
    accommodationsDetail: [
      'Computadora con lector de pantalla JAWS y NVDA',
      'Auriculares con cancelación de ruido',
      'Capacitación de 2 semanas con material accesible',
      'Pausas activas cada 2 horas',
    ],
    salaryBenefits: '$520 al mes, beneficios de ley, IESS desde el primer día y bono de internet de $25.',
    easyRead: {
      jobTitle: 'Trabajo: atender llamadas',
      whatYouDo: ['Contestas llamadas de clientes.', 'Ayudas con sus dudas.'],
      whereAndWhen: ['Trabajas desde tu casa.', 'De lunes a viernes.', '8 horas cada día.'],
      pay: ['520 dólares cada mes.'],
      whatYouGet: ['Una computadora que lee en voz alta.', 'Te enseñamos todo. No necesitas experiencia.'],
      whatYouNeed: ['Haber terminado el colegio.'],
    },
    compatibleDisabilities: ['physical', 'visual', 'psychosocial'],
    physicalDemands: ['phoneSpeaking', 'hearing'],
    accommodationsOffered: ['seated', 'screenReader', 'adaptedKeyboard', 'flexibleSchedule'],
    keywords: ['atencion', 'cliente', 'telefono', 'call center', 'computacion'],
    minEducation: 'highSchool',
  }),
  T({
    title: 'Analista de datos junior',
    companies: ['Andes Tech', 'Seguros Equinoccio'],
    places: [QUITO],
    modality: 'hybrid',
    schedule: 'fullTime',
    dailyHours: 8,
    salaryMin: 800,
    salaryMax: 800,
    summary: 'Preparas reportes en Excel y Power BI. Oficina con rampa, ascensor y baño accesible.',
    description: 'Preparas reportes semanales en Excel y Power BI para el área comercial. Tres días en oficina y dos desde casa.',
    requirements: ['Excel intermedio', 'Título técnico o universitario'],
    accommodationsDetail: ['Oficina con rampa, ascensor y baño accesible', 'Escritorio de altura regulable'],
    salaryBenefits: '$800 al mes y beneficios de ley.',
    easyRead: null,
    compatibleDisabilities: ['physical', 'hearing', 'psychosocial'],
    physicalDemands: ['seeScreen'],
    accommodationsOffered: ['seated', 'ramp', 'flexibleSchedule'],
    keywords: ['excel', 'datos', 'reportes', 'analista'],
    minEducation: 'technical',
  }),
  T({
    title: 'Transcriptor de audio',
    companies: ['Archivo Nacional'],
    places: [PAIS],
    modality: 'remote',
    schedule: 'partTime',
    dailyHours: 4,
    salaryMin: 500,
    salaryMax: 500,
    summary: 'Escuchas grabaciones históricas y las pasas a texto. Trabajas a tu ritmo con metas semanales.',
    description: 'Escuchas grabaciones históricas y las pasas a texto. Trabajas a tu ritmo con metas semanales.',
    requirements: ['Buena ortografía', 'Computadora con internet'],
    accommodationsDetail: ['Software de dictado incluido: escribes menos con el teclado', 'Metas semanales, sin horario fijo'],
    salaryBenefits: '$500 al mes.',
    easyRead: null,
    compatibleDisabilities: ['physical', 'psychosocial'],
    physicalDemands: ['hearing'],
    accommodationsOffered: ['seated', 'flexibleSchedule', 'adaptedKeyboard'],
    keywords: ['transcripcion', 'computacion', 'digitacion'],
    minEducation: 'highSchool',
  }),
  T({
    title: 'Moderador de contenido',
    companies: ['Pacífico Media'],
    places: [P('Manta', 'manabi')],
    modality: 'remote',
    schedule: 'fullTime',
    dailyHours: 8,
    salaryMin: 560,
    salaryMax: 560,
    summary: 'Revisas publicaciones en redes sociales. Equipo con intérprete de lengua de señas en reuniones.',
    description: 'Revisas publicaciones en redes sociales y marcas las que no cumplen las normas de la comunidad.',
    requirements: ['Bachillerato completo', 'Manejo de redes sociales'],
    accommodationsDetail: ['Intérprete de lengua de señas en las reuniones', 'Comunicación del equipo por chat'],
    salaryBenefits: '$560 al mes y beneficios de ley.',
    easyRead: null,
    compatibleDisabilities: ['hearing', 'physical', 'psychosocial'],
    physicalDemands: ['seeScreen'],
    accommodationsOffered: ['signLanguage', 'seated', 'flexibleSchedule'],
    keywords: ['redes', 'contenido', 'computacion'],
    minEducation: 'highSchool',
  }),
  T({
    title: 'Auxiliar de digitación',
    companies: ['Seguros Equinoccio', 'Clínica San Gabriel'],
    places: [QUITO, P('Ambato', 'tungurahua')],
    modality: 'onSite',
    schedule: 'fullTime',
    dailyHours: 8,
    salaryMin: 470,
    salaryMax: 520,
    summary: 'Ingresas datos de formularios al sistema. Trabajo sentado, con rampa y teclado adaptado.',
    description: 'Ingresas datos de formularios al sistema y revisas que estén completos.',
    requirements: ['Manejo de Excel'],
    accommodationsDetail: ['Rampa y ascensor', 'Teclado adaptado', 'Intérprete de señas para la capacitación'],
    salaryBenefits: 'Entre $470 y $520 al mes y beneficios de ley.',
    easyRead: null,
    compatibleDisabilities: ['physical', 'hearing', 'intellectual', 'psychosocial'],
    physicalDemands: ['seeScreen', 'bothHands'],
    accommodationsOffered: ['seated', 'ramp', 'adaptedKeyboard', 'signLanguage'],
    keywords: ['digitacion', 'excel', 'computacion'],
    minEducation: 'highSchool',
  }),
  T({
    title: 'Ayudante de cocina',
    companies: ['Restaurante Mitad del Mundo', 'Cafetería Central'],
    places: [CUENCA, P('Loja', 'loja')],
    modality: 'onSite',
    schedule: 'partTime',
    dailyHours: 4,
    salaryMin: 470,
    salaryMax: 470,
    summary: 'Apoyas en la preparación de alimentos. Equipo que se comunica en lengua de señas.',
    description: 'Lavas y picas ingredientes, y mantienes limpia la cocina.',
    requirements: [],
    accommodationsDetail: ['Compañeros que usan lengua de señas', 'Instrucciones con pictogramas'],
    salaryBenefits: '$470 al mes y beneficios de ley.',
    easyRead: {
      jobTitle: 'Trabajo: ayudar en la cocina',
      whatYouDo: ['Lavas verduras.', 'Cortas verduras.', 'Limpias la cocina.'],
      whereAndWhen: ['Trabajas en un restaurante.', '4 horas cada día.'],
      pay: ['470 dólares cada mes.'],
      whatYouGet: ['Te explican con dibujos.'],
      whatYouNeed: ['Ganas de aprender.'],
    },
    compatibleDisabilities: ['hearing', 'intellectual', 'psychosocial'],
    physicalDemands: ['standing', 'bothHands'],
    accommodationsOffered: ['signLanguage', 'flexibleSchedule'],
    keywords: ['cocina', 'alimentos'],
    minEducation: null,
  }),
  T({
    title: 'Asesor de ventas',
    companies: ['Electro Hogar', 'Tienda Mitad del Mundo'],
    places: [GYE, P('Manta', 'manabi')],
    modality: 'hybrid',
    schedule: 'fullTime',
    dailyHours: 8,
    salaryMin: 500,
    salaryMax: 800,
    summary: 'Atiendes a clientes en tienda y por WhatsApp. Local con rampa.',
    description: 'Asesoras a clientes en la tienda y por WhatsApp, y registras las ventas.',
    requirements: ['Experiencia en ventas'],
    accommodationsDetail: ['Local con rampa', 'Silla en el puesto de caja'],
    salaryBenefits: 'Desde $500 al mes más comisiones.',
    easyRead: null,
    compatibleDisabilities: ['physical', 'hearing', 'psychosocial'],
    physicalDemands: ['phoneSpeaking'],
    accommodationsOffered: ['seated', 'ramp'],
    keywords: ['ventas', 'cliente'],
    minEducation: 'highSchool',
  }),
  T({
    title: 'Pasante de recursos humanos',
    companies: ['Banco del Litoral'],
    places: [GYE],
    modality: 'hybrid',
    schedule: 'internship',
    dailyHours: 6,
    salaryMin: 470,
    salaryMax: 470,
    summary: 'Apoyas en la selección de personal. Pasantía de 6 meses con posibilidad de contrato.',
    description: 'Apoyas en la revisión de hojas de vida y la coordinación de entrevistas.',
    requirements: ['Estudiante de los últimos semestres'],
    accommodationsDetail: ['Oficina con ascensor', 'Horario flexible para clases'],
    salaryBenefits: '$470 al mes durante la pasantía.',
    easyRead: null,
    compatibleDisabilities: ['physical', 'visual', 'hearing', 'psychosocial'],
    physicalDemands: [],
    accommodationsOffered: ['ramp', 'flexibleSchedule', 'screenReader'],
    keywords: ['recursos humanos', 'computacion', 'excel'],
    minEducation: 'highSchool',
  }),
  T({
    title: 'Tutor de inglés en línea',
    companies: ['Aprende Ya'],
    places: [PAIS],
    modality: 'remote',
    schedule: 'partTime',
    dailyHours: 4,
    salaryMin: 400,
    salaryMax: 700,
    summary: 'Das clases de inglés por videollamada desde tu casa.',
    description: 'Das clases de inglés por videollamada y corriges tareas.',
    requirements: ['Inglés avanzado'],
    accommodationsDetail: ['Plataforma compatible con lector de pantalla'],
    salaryBenefits: 'Entre $400 y $700 al mes según las horas.',
    easyRead: null,
    compatibleDisabilities: ['physical', 'visual', 'psychosocial'],
    physicalDemands: ['phoneSpeaking', 'hearing'],
    accommodationsOffered: ['seated', 'flexibleSchedule', 'screenReader'],
    keywords: ['ingles', 'docente'],
    minEducation: 'university',
  }),
]

const pick = <T>(a: readonly T[]) => a[Math.floor(Math.random() * a.length)]!

const toInput = ({ companies: _c, places: _p, ...t }: Template, company: string, place: Place): JobInput => ({
  ...t,
  company,
  city: place.city,
  province: place.province,
  isActive: true,
})

/** Ofertas fijas del seed: una por plantilla, con la primera empresa y ciudad. */
export const SEED_JOBS: JobInput[] = JOB_TEMPLATES.map((t) => toInput(t, t.companies[0]!, t.places[0]!))

/** "Generar N ofertas al azar" */
export function randomJobs(n: number): JobInput[] {
  return Array.from({ length: n }, () => {
    const t = pick(JOB_TEMPLATES)
    const bump = Math.round(Math.random() * 4) * 25
    const j = toInput(t, pick(t.companies), pick(t.places))
    return {
      ...j,
      salaryMin: j.salaryMin == null ? null : j.salaryMin + bump,
      salaryMax: j.salaryMax == null ? null : j.salaryMax + bump,
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
