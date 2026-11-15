import type { InjectOptions } from 'fastify'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { SEED_JOBS } from './seed/demoData.js'
import { admin, bearer, createTestApp, fakeJpeg, multipart } from './test/testApp.js'

let t: Awaited<ReturnType<typeof createTestApp>>
let token = ''
let idNumber = ''
const jobIds: Record<string, string> = {}

beforeAll(async () => {
  t = await createTestApp()
})
afterAll(async () => t?.close())

const inject = (opts: InjectOptions) => t.app.inject(opts)

describe('API de Capaz (flujo completo)', () => {
  it('CORS: solo los orígenes de CORS_ORIGINS', async () => {
    const preflight = (origin: string) =>
      inject({
        method: 'OPTIONS',
        url: '/api/jobs',
        headers: { origin, 'access-control-request-method': 'GET', 'access-control-request-headers': 'authorization' },
      })
    const ok = await preflight('http://localhost:5173')
    expect(ok.headers['access-control-allow-origin']).toBe('http://localhost:5173')
    expect(String(ok.headers['access-control-allow-headers'])).toMatch(/Authorization/i)
    const blocked = await preflight('https://otro-sitio.example')
    expect(blocked.headers['access-control-allow-origin']).toBeUndefined()
  })

  it('health y catálogo', async () => {
    expect((await inject({ url: '/api/health' })).json()).toEqual({ ok: true })
    const cat = (await inject({ url: '/api/catalog' })).json()
    expect(cat.accommodations.map((a: { value: string }) => a.value)).toContain('adaptedKeyboard')
    expect(cat.recommendThreshold).toBe(70)
  })

  it('admin: exige token, crea ofertas y genera al azar', async () => {
    expect((await inject({ method: 'GET', url: '/api/admin/jobs' })).statusCode).toBe(401)
    expect((await inject({ method: 'GET', url: '/api/admin/jobs', headers: { authorization: 'Bearer malo-malo-malo' } })).statusCode).toBe(403)

    for (const j of SEED_JOBS) {
      const r = await inject({ method: 'POST', url: '/api/admin/jobs', headers: admin, payload: j })
      expect(r.statusCode, r.body).toBe(201)
      jobIds[j.title] = r.json().id
    }
    const bad = await inject({ method: 'POST', url: '/api/admin/jobs', headers: admin, payload: { ...SEED_JOBS[0], physicalDemands: ['volar'] } })
    expect(bad.statusCode).toBe(400)
    expect(bad.json().error.code).toBe('VALIDATION_ERROR')

    const rnd = await inject({ method: 'POST', url: '/api/admin/jobs/random', headers: admin, payload: { count: 10 } })
    expect(rnd.statusCode).toBe(201)
    expect(rnd.json().items).toHaveLength(10)
  })

  it('ofertas públicas con filtros', async () => {
    const all = (await inject({ url: '/api/jobs?pageSize=5' })).json()
    expect(all.total).toBe(SEED_JOBS.length + 10)
    expect(all.items).toHaveLength(5)

    const f = (await inject({ url: '/api/jobs?accessibleFor=visual&accommodations=screenReader&modality=remote' })).json()
    expect(f.total).toBeGreaterThan(0)
    for (const j of f.items) {
      expect(j.compatibleDisabilities).toContain('visual')
      expect(j.accommodationsOffered).toContain('screenReader')
      expect(j.modality).toBe('remote')
    }
    const q = (await inject({ url: `/api/jobs?q=${encodeURIComponent('Conductor')}` })).json()
    expect(q.items.every((j: { title: string }) => j.title === 'Conductor profesional')).toBe(true)

    const d = await inject({ url: `/api/jobs/${jobIds['Desarrollador backend']}` })
    expect(d.json()).toMatchObject({ match: null, applicationId: null })
  })

  it('traspaso al celular: QR, subida desde el celular y OCR', async () => {
    const h = await inject({ method: 'POST', url: '/api/id-card/handoffs' })
    expect(h.statusCode).toBe(201)
    const { token: ht, url } = h.json()
    expect(url).toContain('/signup/id-card/camera?handoff=')
    expect((await inject({ url: `/api/id-card/handoffs/${ht}` })).json().status).toBe('waiting')

    const up = multipart({ image: { data: fakeJpeg('handoff-front'), filename: 'f.jpg', type: 'image/jpeg' } })
    expect((await inject({ method: 'PUT', url: `/api/id-card/handoffs/${ht}/front`, ...up })).statusCode).toBe(200)
    expect((await inject({ url: `/api/id-card/handoffs/${ht}` })).json().status).toBe('partial')
    const img = await inject({ url: `/api/id-card/handoffs/${ht}/front` })
    expect(img.headers['content-type']).toBe('image/jpeg')
    expect(img.rawPayload.equals(fakeJpeg('handoff-front'))).toBe(true) // se descifra igual

    const incomplete = await inject({ method: 'POST', url: `/api/id-card/handoffs/${ht}/scan` })
    expect(incomplete.statusCode).toBe(410)

    const up2 = multipart({ image: { data: fakeJpeg('handoff-back'), filename: 'b.jpg', type: 'image/jpeg' } })
    await inject({ method: 'PUT', url: `/api/id-card/handoffs/${ht}/back`, ...up2 })
    const s = await inject({ method: 'POST', url: `/api/id-card/handoffs/${ht}/scan` })
    expect(s.statusCode, s.body).toBe(200)
    expect(s.json().scanId).toBeTruthy()
    expect((await inject({ url: `/api/id-card/handoffs/${ht}` })).json().status).toBe('consumed')
  })

  it('carnet: rechaza archivos que no son imágenes', async () => {
    const mp = multipart({
      front: { data: Buffer.from('hola'), filename: 'f.jpg', type: 'image/jpeg' },
      back: { data: fakeJpeg('b'), filename: 'b.jpg', type: 'image/jpeg' },
    })
    const r = await inject({ method: 'POST', url: '/api/id-card/scan', ...mp })
    expect(r.statusCode).toBe(422)
    expect(r.json().error.code).toBe('UNSUPPORTED_FILE')
  })

  it('registro completo: carnet → contacto → experiencia → privacidad, con postulación pendiente', async () => {
    const mp = multipart({
      front: { data: fakeJpeg('front-1'), filename: 'front.jpg', type: 'image/jpeg' },
      back: { data: fakeJpeg('back-1'), filename: 'back.jpg', type: 'image/jpeg' },
    })
    const scan = await inject({ method: 'POST', url: '/api/id-card/scan', ...mp })
    expect(scan.statusCode, scan.body).toBe(200)
    const s = scan.json()
    expect(s.idNumberValid).toBe(true)
    expect(s.needsReview).toContain('disabilityPercent')
    idNumber = s.idNumber

    // Verificación del celular (paso 2)
    const pv = await inject({ method: 'POST', url: '/api/phone-verifications', payload: { phone: '0998765432' } })
    expect(pv.statusCode, pv.body).toBe(202)
    const { verificationId, devCode } = pv.json()
    expect(devCode).toMatch(/^\d{4}$/)
    expect((await inject({ method: 'POST', url: '/api/phone-verifications', payload: { phone: '0998765432' } })).statusCode).toBe(429)

    const body = {
      scanId: s.scanId,
      phoneVerificationId: verificationId,
      idCard: { fullName: s.fullName, idNumber: s.idNumber, birthDate: s.birthDate, disabilityType: 'physical', disabilityPercent: 70, validity: null },
      contact: { fullName: 'Mafer Torres', phone: '0998765432', email: 'Mafer.Torres@gmail.com', city: 'Quito', preferred: 'whatsapp' },
      experience: {
        hasWorked: 'yes',
        experienceText: 'Desarrollador, 5 años de experiencia en programación con Node',
        cvFileName: '',
        education: 'university',
        skills: ['computing'],
        accommodationsNeeded: ['seated'],
        otherAccommodation: '',
      },
      privacy: { useProfile: true, shareOnlyAccommodations: true, discoverable: false },
      applyToJobId: jobIds['Desarrollador backend'],
    }

    const invalid = await inject({ method: 'POST', url: '/api/signup', payload: { ...body, contact: { ...body.contact, phone: '12345' } } })
    expect(invalid.statusCode).toBe(400)
    expect(invalid.json().error.fields['contact.phone']).toMatch(/09/)

    // Sin verificar el código, no se crea la cuenta
    const unverified = await inject({ method: 'POST', url: '/api/signup', payload: body })
    expect(unverified.statusCode).toBe(422)
    expect(unverified.json().error.code).toBe('PHONE_NOT_VERIFIED')

    const wrong = String((Number(devCode) + 1) % 10000).padStart(4, '0')
    const bad = await inject({ method: 'POST', url: `/api/phone-verifications/${verificationId}/verify`, payload: { code: wrong } })
    expect(bad.json().error.code).toBe('INVALID_CODE')
    const ok = await inject({ method: 'POST', url: `/api/phone-verifications/${verificationId}/verify`, payload: { code: devCode } })
    expect(ok.json()).toMatchObject({ verified: true, phone: '0998765432' })

    // La verificación es de otro número que el del formulario
    const otherPhone = await inject({ method: 'POST', url: '/api/signup', payload: { ...body, contact: { ...body.contact, phone: '0991112222' } } })
    expect(otherPhone.json().error.code).toBe('PHONE_NOT_VERIFIED')

    const r = await inject({ method: 'POST', url: '/api/signup', payload: body })
    expect(r.statusCode, r.body).toBe(201)
    const out = r.json()
    token = out.token
    expect(out.applicationId).toBeTruthy()
    expect(out.candidate.contact).toMatchObject({ fullName: 'Mafer Torres', email: 'mafer.torres@gmail.com' })
    expect(out.candidate.privacy.consentAt).toBeTruthy()
    expect(out.candidate.contact.phoneVerifiedAt).toBeTruthy()
    // La verificación ya se usó
    const used = await t.db.phoneVerification.findUniqueOrThrow({ where: { id: verificationId } })
    expect(used.consumedAt).not.toBeNull()

    // Las fotos se borraron al confirmar y el consentimiento quedó registrado
    const stored = await t.db.idCardScan.findUniqueOrThrow({ where: { id: s.scanId } })
    expect(stored).toMatchObject({ status: 'confirmed', frontImage: null, backImage: null })
    const consents = await t.db.consentRecord.findMany({ where: { candidateId: out.candidate.id } })
    expect(consents.map((c) => c.purpose).sort()).toEqual(['discoverable', 'keepIdCardImages', 'shareOnlyAccommodations', 'useProfile'])

    // El mismo escaneo no se puede reutilizar
    expect((await inject({ method: 'POST', url: '/api/signup', payload: body })).statusCode).toBe(404)
  })

  it('recomendaciones /for-you', async () => {
    expect((await inject({ url: '/api/matches' })).statusCode).toBe(401)
    const m = (await inject({ url: '/api/matches', headers: bearer(token) })).json()
    const dev = m.recommended.find((x: { job: { title: string } }) => x.job.title === 'Desarrollador backend')
    expect(dev.match.score).toBeGreaterThanOrEqual(90)
    expect(m.rejected.some((x: { job: { title: string } }) => x.job.title === 'Conductor profesional')).toBe(true)

    const d = (await inject({ url: `/api/jobs/${jobIds['Desarrollador backend']}`, headers: bearer(token) })).json()
    expect(d.match.recommended).toBe(true)
    expect(d.applicationId).toBeTruthy()
  })

  it('postulaciones: crear, duplicado, listar, mover estado (admin) y retirar', async () => {
    const jobId = jobIds['Agente de atención telefónica']
    const a = await inject({ method: 'POST', url: '/api/applications', headers: bearer(token), payload: { jobId } })
    expect(a.statusCode, a.body).toBe(201)
    expect(a.json()).toMatchObject({ status: 'sent', stage: 1, statusLabel: 'Enviada' })
    const dup = await inject({ method: 'POST', url: '/api/applications', headers: bearer(token), payload: { jobId } })
    expect(dup.json().error.code).toBe('ALREADY_APPLIED')

    const list = (await inject({ url: '/api/applications', headers: bearer(token) })).json()
    expect(list.items).toHaveLength(2)

    const p = await inject({
      method: 'PATCH',
      url: `/api/admin/applications/${a.json().id}`,
      headers: admin,
      payload: { status: 'interview', interviewAt: '2026-11-20T15:00:00-05:00', interviewPlace: 'Videollamada' },
    })
    expect(p.json()).toMatchObject({ stage: 3, interview: { place: 'Videollamada' } })

    const detail = (await inject({ url: `/api/applications/${a.json().id}`, headers: bearer(token) })).json()
    expect(detail.events.map((e: { status: string }) => e.status)).toEqual(['sent', 'interview'])

    const w = await inject({ method: 'POST', url: `/api/applications/${a.json().id}/withdraw`, headers: bearer(token) })
    expect(w.json().status).toBe('withdrawn')
  })

  it('perfil: cambiar el celular exige verificar el número nuevo', async () => {
    const noVerif = await inject({ method: 'PATCH', url: '/api/me', headers: bearer(token), payload: { contact: { phone: '0987654321' } } })
    expect(noVerif.json().error.code).toBe('PHONE_NOT_VERIFIED')

    const pv = (await inject({ method: 'POST', url: '/api/phone-verifications', payload: { phone: '0987654321', channel: 'sms' } })).json()
    await inject({ method: 'POST', url: `/api/phone-verifications/${pv.verificationId}/verify`, payload: { code: pv.devCode } })
    const r = await inject({
      method: 'PATCH',
      url: '/api/me',
      headers: bearer(token),
      payload: { contact: { phone: '0987654321' }, phoneVerificationId: pv.verificationId },
    })
    expect(r.statusCode, r.body).toBe(200)
    expect(r.json().contact.phone).toBe('0987654321')

    // Otros cambios no piden verificación
    const city = await inject({ method: 'PATCH', url: '/api/me', headers: bearer(token), payload: { contact: { city: 'Cuenca' } } })
    expect(city.json().contact.city).toBe('Cuenca')
  })

  it('perfil: vista de la empresa, cambio de privacidad registrado y exportación', async () => {
    const cv = (await inject({ url: '/api/me/company-view', headers: bearer(token) })).json()
    expect(cv.disability).toBeNull()
    expect(JSON.stringify(cv)).not.toContain(idNumber)

    const p = await inject({ method: 'PATCH', url: '/api/me', headers: bearer(token), payload: { privacy: { shareOnlyAccommodations: false } } })
    expect(p.json().privacy.shareOnlyAccommodations).toBe(false)
    const cv2 = (await inject({ url: '/api/me/company-view', headers: bearer(token) })).json()
    expect(cv2.disability).toEqual({ type: 'physical', percent: 70 })

    const ex = await inject({ url: '/api/me/export', headers: bearer(token) })
    expect(ex.headers['content-disposition']).toContain('attachment')
    expect(ex.json().consents.filter((c: { purpose: string }) => c.purpose === 'shareOnlyAccommodations')).toHaveLength(2)
  })

  it('ingreso sin contraseña: código de 4 dígitos', async () => {
    const unknown = await inject({ method: 'POST', url: '/api/auth/code', payload: { idNumber: '1710034065' } })
    expect(unknown.statusCode).toBe(202)
    expect(unknown.json().devCode).toBeUndefined() // misma respuesta, sin revelar si existe

    const r = await inject({ method: 'POST', url: '/api/auth/code', payload: { idNumber } })
    expect(r.statusCode).toBe(202)
    const code = r.json().devCode as string
    expect(code).toMatch(/^\d{4}$/)

    const again = await inject({ method: 'POST', url: '/api/auth/code', payload: { idNumber } })
    expect(again.statusCode).toBe(429)

    const wrong = String((Number(code) + 1) % 10000).padStart(4, '0')
    expect((await inject({ method: 'POST', url: '/api/auth/verify', payload: { idNumber, code: wrong } })).json().error.code).toBe('INVALID_CODE')

    const ok = await inject({ method: 'POST', url: '/api/auth/verify', payload: { idNumber, code } })
    expect(ok.statusCode, ok.body).toBe(200)
    const newToken = ok.json().token
    expect((await inject({ url: '/api/me', headers: bearer(newToken) })).statusCode).toBe(200)

    // El código no sirve dos veces
    expect((await inject({ method: 'POST', url: '/api/auth/verify', payload: { idNumber, code } })).statusCode).toBe(401)

    expect((await inject({ method: 'POST', url: '/api/auth/logout', headers: bearer(newToken) })).statusCode).toBe(204)
    expect((await inject({ url: '/api/me', headers: bearer(newToken) })).statusCode).toBe(401)
  })

  it('admin: probar match rápido y candidatos de prueba', async () => {
    const m = await inject({
      method: 'POST',
      url: '/api/admin/match',
      headers: admin,
      payload: { candidate: { disabilityType: 'physical', disabilityPercent: 70, accommodationsNeeded: ['seated'], skills: ['computing'], experienceText: 'Desarrollador' } },
    })
    expect(m.statusCode, m.body).toBe(200)
    expect(m.json().items[0].match.score).toBeGreaterThan(0)

    const c = await inject({ method: 'POST', url: '/api/admin/candidates/random', headers: admin, payload: { count: 3 } })
    expect(c.json().count).toBe(3)
    const list = (await inject({ url: '/api/admin/candidates', headers: admin })).json()
    expect(list.items).toHaveLength(3) // nunca incluye personas reales
    const cm = await inject({ url: `/api/admin/candidates/${list.items[0].id}/matches`, headers: admin })
    expect(cm.statusCode).toBe(200)
  })

  it('voz: transcribe y tts simulados', async () => {
    const mp = multipart({ audio: { data: Buffer.from('audio'), filename: 'a.webm', type: 'audio/webm' } })
    expect((await inject({ method: 'POST', url: '/api/transcribe', ...mp })).json()).toEqual({ text: 'texto de prueba dictado' })
    const tts = await inject({ method: 'POST', url: '/api/tts', payload: { text: 'Hola', rate: 1 } })
    expect(tts.headers['content-type']).toBe('audio/wav')
    expect(tts.rawPayload.subarray(0, 4).toString()).toBe('RIFF')
  })

  it('borrar mi cuenta elimina todo en cascada', async () => {
    const r = await inject({ method: 'POST', url: '/api/auth/code', payload: { idNumber } })
    // Hay límite de 1 código por minuto: se crea la sesión directo en la base para esta prueba
    expect([202, 429]).toContain(r.statusCode)
    const c = await t.db.candidate.findUniqueOrThrow({ where: { idNumber } })
    const { createSession } = await import('./lib/sessions.js')
    const s = await createSession(t.app, c.id)
    expect((await inject({ method: 'DELETE', url: '/api/me', headers: bearer(s.token) })).statusCode).toBe(204)
    expect(await t.db.candidate.count({ where: { idNumber } })).toBe(0)
    expect(await t.db.application.count({ where: { candidateId: c.id } })).toBe(0)
    expect(await t.db.idCardScan.count({ where: { candidateId: c.id } })).toBe(0)
    expect(await t.db.consentRecord.count({ where: { candidateId: c.id } })).toBe(0)
  })

  it('errores: ruta inexistente y openapi', async () => {
    expect((await inject({ url: '/api/nada' })).json().error.code).toBe('NOT_FOUND')
    const spec = t.app.swagger() as { paths: Record<string, unknown> }
    expect(Object.keys(spec.paths)).toContain('/api/signup')
  })
})
