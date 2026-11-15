import { describe, expect, it } from 'vitest'
import { DEMO_CANDIDATE, SEED_JOBS } from '../seed/demoData.js'
import { isValidCedula, withCheckDigit } from './cedula.js'
import { RECOMMEND_THRESHOLD, scoreJob, type MatchJob } from './matchEngine.js'

const job = (title: string): MatchJob => ({ id: title, ...SEED_JOBS.find((j) => j.title === title)! })

describe('cédula ecuatoriana', () => {
  it('acepta cédulas con dígito verificador correcto', () => {
    expect(isValidCedula('1710034065')).toBe(true)
    expect(isValidCedula(withCheckDigit('091234567'))).toBe(true)
  })
  it('rechaza dígito verificador, provincia o tercer dígito inválidos', () => {
    expect(isValidCedula('1710034060')).toBe(false)
    expect(isValidCedula('2510034065')).toBe(false) // provincia 25
    expect(isValidCedula(withCheckDigit('176000000'))).toBe(false) // tercer dígito 6
    expect(isValidCedula('09123')).toBe(false)
  })
})

describe('motor de match (ejemplo del documento)', () => {
  it('Desarrollador backend: compatible + ofrece seated + experiencia → recomendado (~94 %)', () => {
    const m = scoreJob(DEMO_CANDIDATE, job('Desarrollador backend'))
    expect(m.rejected).toBe(false)
    expect(m.score).toBeGreaterThanOrEqual(90)
    expect(m.recommended).toBe(true)
    expect(m.reasons).toContain('Trabajo sentado, desde casa')
    expect(m.reasons.some((r) => r.startsWith('Sabes de '))).toBe(true)
  })

  it('las razones no tienen género', () => {
    const c = { ...DEMO_CANDIDATE, hasWorked: true, skills: ['excel'], accommodationsNeeded: ['seated', 'adaptedKeyboard'] }
    const office = scoreJob(c, job('Analista de datos junior'))
    expect(office.reasons).toContain('Trabajo sentado')
    expect(office.reasons).toContain('Usas Excel, como en tu último trabajo')
    const phone = scoreJob({ ...c, disabilityType: 'visual' }, job('Agente de atención telefónica'))
    expect(phone.reasons).toContain('Te dan el teclado adaptado que pediste')
    const all = [office, phone, scoreJob(DEMO_CANDIDATE, job('Desarrollador backend'))].flatMap((m) => [...m.reasons, ...m.warnings])
    // "Trabajo sentado" describe el trabajo; lo que no debe aparecer es un adjetivo sobre la persona
    expect(all.join(' ')).not.toMatch(/\b(trabajas sentad[oa]|trabajar sentad[oa]|sentada|cansad[oa]|preparad[oa]|interesad[oa]|bienvenid[oa])\b/i)
  })

  it('Conductor profesional: seated choca con walkingDriving → descartado (0 %)', () => {
    const m = scoreJob(DEMO_CANDIDATE, job('Conductor profesional'))
    expect(m).toMatchObject({ rejected: true, score: 0, recommended: false })
    expect(m.rejectReason).toBe('El puesto exige caminar o conducir') // mockup: "descartado: exige caminar/conducir"
  })

  it('descarta si el tipo de discapacidad no es compatible', () => {
    const m = scoreJob({ ...DEMO_CANDIDATE, disabilityType: 'intellectual' }, job('Desarrollador backend'))
    expect(m.rejectReason).toBe('Tipo de discapacidad no compatible')
  })

  it('el lector de pantalla resuelve el choque con "ver la pantalla" si la oferta lo ofrece', () => {
    const c = { ...DEMO_CANDIDATE, disabilityType: 'visual', accommodationsNeeded: ['screenReader'] }
    const base = job('Desarrollador backend')
    expect(scoreJob(c, { ...base, physicalDemands: ['seeScreen'] }).rejected).toBe(false)
    expect(scoreJob(c, { ...base, physicalDemands: ['seeScreen'], accommodationsOffered: [] }).rejected).toBe(true)
  })

  it('sin ajustes marcados da 15 de 30 y pide completarlos', () => {
    const m = scoreJob({ ...DEMO_CANDIDATE, accommodationsNeeded: [] }, job('Desarrollador backend'))
    expect(m.breakdown.accommodations).toBe(15)
    expect(m.warnings.some((w) => w.includes('ajustes'))).toBe(true)
  })

  it('avisa la ciudad en ofertas presenciales de otra ciudad', () => {
    const m = scoreJob({ ...DEMO_CANDIDATE, city: 'Loja' }, { ...job('Auxiliar de digitación'), city: 'Quito' })
    expect(m.warnings).toContain('Queda en Quito: pregunta si acepta trabajo 100 % remoto')
  })

  it('el umbral de recomendación es 70', () => expect(RECOMMEND_THRESHOLD).toBe(70))
})
