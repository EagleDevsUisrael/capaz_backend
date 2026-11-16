# capaz_backend

API de **Capaz**, una plataforma para que personas con discapacidad en Ecuador encuentren empleo y postulen (ODS 10).
**¿Vas a integrarlo o modificarlo? Empieza por [HANDOFF.md](HANDOFF.md).**

Implementa lo que pide la *Documentación de diseño y técnica* (11 nov 2026) para el MVP:
registro en 4 pasos con OCR del carnet y verificación del celular, ingreso sin contraseña,
motor de match con razones, postulaciones, respaldos de voz y admin de demostración.

**Stack:** Node 22+ · TypeScript · Fastify 5 · Prisma 7 · PostgreSQL (Supabase) · zod 4 · Vitest

## Puesta en marcha

```bash
npm install                  # también genera el cliente de Prisma
cp .env.example .env         # completa DATABASE_URL, DIRECT_URL, ID_CARD_ENCRYPTION_KEY y ADMIN_TOKEN
npm run db:migrate           # crea las tablas, o aplica las migraciones que falten
npm run db:seed              # carga 8 ofertas de ejemplo (si la tabla está vacía)
npm run dev                  # http://localhost:3000 · documentación interactiva en /docs
```

| Script | Qué hace |
|---|---|
| `npm run dev` | Servidor con recarga automática |
| `npm run build` / `npm start` | Compila a `dist/` y lo ejecuta (producción) |
| `npm test` | Pruebas unitarias, de integración y de migraciones contra un Postgres en memoria (PGlite). No necesita Supabase |
| `npm run typecheck` | Revisión de tipos |
| `npm run db:migrate` | Aplica las migraciones pendientes en `DIRECT_URL` (`-- status` solo muestra el estado) |
| `npm run db:migration -- <nombre>` | Crea la siguiente migración a partir de los cambios en el modelo |
| `npm run db:sql` | Regenera `database/schema.sql` (el estado completo) |
| `npm run db:seed` | Ofertas de ejemplo (`-- --force` recarga las de demostración) |
| `npm run openapi` | Regenera `openapi.json` (el contrato de la API) |

## Base de datos y migraciones

```
prisma/schema.prisma          modelo (tablas, enums, índices, relaciones)
src/domain/catalog.ts         códigos válidos de las listas (habilidades, ajustes…) → CHECK de los arrays
database/migrations/          0001_init.sql, 0002_….sql… → cambios incrementales, en orden
database/schema.sql           estado completo, solo de referencia; la base se crea con las migraciones (generado)
database/.snapshot/           cómo quedó el modelo en la última migración (no se edita)
```

**Cada migración es un archivo SQL numerado** que se puede ejecutar de dos formas:

- `npm run db:migrate`, que aplica las pendientes usando `DIRECT_URL`.
- Pegando el archivo en el **SQL Editor de Supabase → Run**, una migración a la vez y en orden.

Las dos formas son equivalentes y se pueden mezclar. Cada archivo:

- corre en una **transacción**: si algo falla, no se aplica nada;
- **se registra** en la tabla `schema_migrations`;
- **se niega a correr** si ya se aplicó o si falta la anterior. Pegarlo dos veces no rompe nada.

**Para cambiar la base** (lo hace quien toca el backend):

1. Edita `prisma/schema.prisma` y, si corresponde, los catálogos de `src/domain/catalog.ts`.
2. Ejecuta `npm run db:migration -- agregar_telefono_alterno`. Se crea `database/migrations/0002_agregar_telefono_alterno.sql`, que incluye:
   - el SQL de Prisma: columnas, tablas, enums e índices;
   - el reemplazo de los `CHECK` cuyo catálogo cambió;
   - RLS para las tablas nuevas.

   También se actualizan el snapshot y `schema.sql`.
3. **Revisa el SQL.** Prisma no detecta renombres: los convierte en borrar y crear, y eso pierde datos. Tampoco rellena columnas nuevas obligatorias en tablas que ya tienen filas. Corrige esos casos a mano antes de hacer commit.
4. Ejecuta `npm test`. Una prueba comprueba que aplicar todas las migraciones en orden da exactamente la misma base que `schema.sql`.
5. Haz commit de la migración, el snapshot y `schema.sql`, y avisa al equipo para que la aplique.

Reglas: **no edites una migración que ya se aplicó en Supabase**; si hay que corregirla, crea otra. Tampoco uses `prisma db push` ni `prisma migrate dev` contra Supabase, porque no conocen las reglas extra de este esquema (RLS, `CHECK` y triggers).

Qué incluye el esquema:

- **11 tablas y `schema_migrations`.** Las listas son arrays nativos (`text[]`) con un `CHECK` que solo acepta códigos del catálogo, y un índice GIN para los filtros.
- **Enums de Postgres** para los valores fijos: tipo de discapacidad, estudios, estado de la postulación, etc.
- **RLS activado sin políticas en todas las tablas.** Supabase publica el esquema `public` por su API REST, y aquí hay datos de discapacidad. Con RLS, nadie puede leerlos con las claves `anon` o `authenticated`. El backend entra con el rol `postgres`, que no está sujeto a RLS.

## Contrato de la API

Todas las rutas van bajo `/api`. Con `npm run dev`, la referencia completa con los esquemas está en `/docs` y en [`openapi.json`](openapi.json).

- **Sesión:** cabecera `Authorization: Bearer <token>`, que devuelven `/signup` y `/auth/verify`.
- **Admin:** cabecera `Authorization: Bearer <ADMIN_TOKEN>`.
- **Errores:** `{ "error": { "code", "message", "fields"? } }`. `code` es estable y el front decide con él. `message` está en español y se puede mostrar o leer en voz alta. En los errores de validación, `fields` usa rutas como `contact.phone`.

| Pantalla (ruta del front) | Endpoint |
|---|---|
| Inicio `/` | `GET /stats` → `{ activeJobs, provinces, remoteJobs }` ("1.240 ofertas inclusivas activas · 24 provincias") |
| Búsqueda y filtros `/` | `GET /jobs?q&where&features&salary&schedule&sort&page&pageSize` → `{ total, sort, facets, items }`. `where` acepta una ciudad o "teletrabajo"; `features` acepta `remote`, `wheelchair`, `screenReader`, `signLanguage` y `flexibleSchedule`; `salary` acepta `470-600`, `600-900` o `900+`; `schedule` acepta `fullTime`, `partTime` o `internship`. `facets` da el conteo de cada filtro, y `sort=compatibility` ("más compatibles") es el orden por defecto con sesión. También se aceptan `accessibleFor`, `accommodations`, `modality` y `salaryMin` |
| Detalle `/jobs/:jobId` | `GET /jobs/:id` → `{ job, match, applicationId }` (`match` solo con sesión). `job` incluye `description` ("Qué harás"), `accommodationsDetail`, `requirements` ("Qué necesitas"), `salaryBenefits`, `dailyHours` y `easyRead` (lectura fácil por secciones) |
| Listas de opciones | `GET /catalog`: códigos y etiquetas (habilidades, ajustes, exigencias, estados) |
| Paso 1 `/signup/id-card` | `POST /id-card/scan` (multipart `front`, `back`; JPG, PNG, HEIC, WEBP o PDF de hasta 10 MB) → `{ scanId, fullName, idNumber, birthDate, disabilityType, disabilityPercent, validity, confidence, needsReview[], idNumberValid }`. `validity` puede ser `'AAAA-MM-DD'`, `'indefinite'` ("Indefinida") o `null` |
| Continuar en el celular | `POST /id-card/handoffs` → `{ token, url, expiresAt }` · `GET /id-card/handoffs/:token` (polling: `waiting`, `partial`, `ready`, `consumed` o `expired`) · `PUT /id-card/handoffs/:token/:side` (celular, multipart `image`) · `GET /id-card/handoffs/:token/:side` (vista previa) · `POST /id-card/handoffs/:token/scan` |
| Paso 3: hoja de vida | `POST /cv-uploads` (multipart `file`: PDF, Word, JPG o PNG de hasta 10 MB) → `{ cvUploadId }`; se manda en `/signup` |
| Paso 4: "Así te verá la empresa" | `POST /company-view/preview { contact, experience, privacy, idCard? }` → `{ fullName, headline, accommodationsNeeded, skills, contact, idCardHidden, disability… }`, sin cuenta |
| Paso 2: verificar celular | `POST /phone-verifications { phone, channel? }` → `{ verificationId, expiresAt }` · `POST /phone-verifications/:id/verify { code }` → `{ verified, usableUntil }` |
| Pasos 2–4 → enviar | `POST /signup` `{ scanId, idCard, contact, phoneVerificationId, experience, privacy, applyToJobId?, cvUploadId? }` → `{ token, expiresAt, candidate, applicationId }` |
| Ingresar `/login` | `POST /auth/code { idNumber }` → 202 con `resendAfterSeconds: 45` ("Reenviar en 0:45") · `POST /auth/verify { idNumber, code }` → `{ token, expiresAt, candidate }` · `POST /auth/logout` |
| Resultados IA `/for-you` | `GET /matches` → `{ firstApplication, recommended[], others[], rejected[], counts: { matching, recommended, totalJobs }, consideredFactors[], profileComplete, missingAccommodations, threshold }` |
| Postular `/applications/:id/sent` | `POST /applications { jobId }` → la postulación con `nextSteps: { reviewBusinessDays: 5, reviewBy, contactChannel, contactValue }` |
| Mis postulaciones `/applications` | `GET /applications` (en "No seleccionada" viene `similarCount`) · `GET /applications/:id` (con línea de tiempo) · `POST /applications/:id/confirm-interview` ("Confirmar asistencia") · `GET /applications/:id/similar` (hasta 4 ofertas parecidas) · `POST /applications/:id/withdraw`. La entrevista es `{ at, mode: inPerson, videoCall o phoneCall, place, confirmedAt }` |
| Mi perfil (diseño pendiente) | `GET` y `PATCH /me` (un celular nuevo exige `phoneVerificationId`) · `GET /me/company-view` ("Así te verá la empresa") · `GET`, `PUT` y `DELETE /me/cv` (hoja de vida) · `GET /me/export` · `DELETE /me` |
| Voz (respaldo) | `POST /transcribe` (multipart `audio`) → `{ text }` · `POST /tts { text, rate }` → audio |
| Admin `/admin/jobs` | `GET` y `POST /admin/jobs` · `GET`, `PUT` y `DELETE /admin/jobs/:id` · `POST /admin/jobs/random { count }` · `POST /admin/match { candidate }` · `GET /admin/candidates` · `POST /admin/candidates/random` · `GET /admin/candidates/:id/matches` · `GET /admin/applications` · `PATCH /admin/applications/:id { status, interviewAt, interviewMode, interviewPlace }` |

Los cuerpos de `idCard`, `contact`, `experience` y `privacy` tienen **la misma forma que `useSignupStore` del front**, y `privacy` agrega `keepIdCardImages` (por defecto `false`). `GET /me` devuelve el perfil con esa misma forma.

## Motor de match

Está en [`src/domain/matchEngine.ts`](src/domain/matchEngine.ts) y sigue el documento:

1. **Descarte (0 %):** el tipo de discapacidad no está en `compatibleDisabilities`, o un ajuste choca con una exigencia del puesto. Por ejemplo, `seated` choca con `standing` y con `walkingDriving`, y `screenReader` choca con `seeScreen` salvo que la oferta ofrezca lector de pantalla. La tabla `CLASHES` está en `catalog.ts`.
2. **Puntaje:** discapacidad compatible 40 · ajustes cubiertos 30 (15 si la persona no marcó ninguno) · experiencia 25 · estudios 5. Se recomiendan las ofertas con **70 o más**.
3. Cada factor deja una razón, siempre en forma neutra y sin género ("Trabajo sentado, desde casa", "Te dan el teclado adaptado que pediste", "Usas Excel, como en tu último trabajo"), y lo que falta deja un aviso ("Queda en Quito: pregunta si acepta trabajo 100 % remoto").

El ejemplo del documento está cubierto por pruebas: el desarrollador backend sale con 94 % y el conductor profesional queda descartado.

## Privacidad (LOPDP)

- La **hoja de vida se guarda cifrada**. Si nadie la vincula a un registro en 2 horas, se borra.
- Las **fotos del carnet se guardan cifradas** con AES-256-GCM (`ID_CARD_ENCRYPTION_KEY`). Se borran al confirmar el registro, salvo que la persona marque que quiere guardarlas (`keepIdCardImages`, apagado por defecto). Los escaneos sin confirmar se borran a las 2 horas, y los traspasos al celular, a los 10 minutos.
- **Cada consentimiento queda registrado** en `consent_records` con la fecha, la versión de la política, la IP y el navegador. También se registra cada cambio posterior.
- **La empresa nunca ve el carnet ni la cédula.** El tipo y el porcentaje de discapacidad solo los ve si la persona desactiva "solo ajustes". `/me/company-view` muestra exactamente eso.
- La persona puede **descargar** (`/me/export`) o **borrar todo** (`DELETE /me`, en cascada).
- **El celular se verifica antes de guardarlo**, tanto en el registro como al cambiarlo, porque el login envía el código a ese número.
- Los tokens de sesión, los códigos y los enlaces del QR se guardan solo como hash. Hay límites: 1 código por minuto, 5 por hora, 5 intentos por código y un límite de pedidos por IP.
- El admin de demostración solo ve **candidatos de prueba** (`is_test`), nunca personas reales.

---

## Para el equipo

### Base de datos (quien crea la base en Supabase)

1. Crea el proyecto en Supabase, en la región más cercana (por ejemplo `us-east-1`). Guarda la contraseña de la base.
2. Crea las tablas de **una** de estas formas:
   - **SQL Editor:** pega `database/migrations/0001_init.sql` → Run, y después `0002_ajustes_mockups.sql` y las siguientes, en orden. No uses `database/schema.sql` para crear la base: aplicando las migraciones, `schema_migrations` siempre dice cuáles están aplicadas (ver [HANDOFF.md](HANDOFF.md)).
   - **Terminal:** completa `DIRECT_URL` en `.env` y ejecuta `npm run db:migrate`.
3. Revisa que quedó bien: en *Table Editor* deben aparecer las tablas con el candado de RLS, y `SELECT * FROM schema_migrations;` debe listar las migraciones aplicadas.
4. Busca las cadenas de conexión en **Connect** (o *Project Settings → Database*) y pásalas por un canal privado, nunca en el repositorio:
   - `DATABASE_URL`: **transaction pooler**, puerto **6543**, con `?pgbouncer=true` al final. La usa la API.
   - `DIRECT_URL`: **conexión directa** (`db.<ref>.supabase.co:5432`) o **session pooler** (puerto **5432**). La usan las migraciones. La directa solo funciona con IPv6; si la red no lo tiene, usa el session pooler.
5. Opcional: `npm run db:seed` carga ofertas de ejemplo para la demo.
6. **Cuando llegue una migración nueva**, aplícala en orden con cualquiera de las dos formas. Si se pega dos veces o fuera de orden, la migración se detiene sola sin cambiar nada.

No actives políticas RLS ni uses las claves `anon` o `service_role` en el front: todo el acceso a datos pasa por esta API.

### Front (capaz_front)

- **URL base:** `http://localhost:3000/api` en desarrollo. Conviene ponerla en una variable como `VITE_API_URL`. El origen del front tiene que estar en `CORS_ORIGINS` del backend; por defecto se acepta `http://localhost:5173`.
- **Contrato:** la referencia interactiva está en `http://localhost:3000/docs`, y el archivo, en `openapi.json`. Con `openapi-typescript openapi.json` se pueden generar los tipos.
- **IA remota protegida con Cloudflare Access:** si `IA_SERVICE_URL` apunta a un hostname con una política `Service Auth`, configura también `CF_ACCESS_CLIENT_ID` y `CF_ACCESS_CLIENT_SECRET`. El backend enviará esos headers junto con `Authorization: Bearer IA_SERVICE_TOKEN`.
- **Sesión:** se guarda el `token` que devuelven `/signup` o `/auth/verify` y se manda como `Authorization: Bearer <token>`. Un 401 significa que hay que ingresar de nuevo.
- **Login:** `POST /auth/code` responde **siempre igual (202)**, exista o no la cédula, para no revelar quién está registrado en una plataforma de discapacidad. El front no puede saber desde ahí si la persona tiene cuenta. Debe mostrar "Si tu cédula está registrada, te enviamos un código" junto con un enlace visible a "Crear cuenta". Si la persona no tiene cuenta, `/auth/verify` responde `INVALID_CODE`.
- **Registro:** al terminar el paso 2, el front llama a `POST /phone-verifications` y luego a `/:id/verify` con el código. El `verificationId` va como `phoneVerificationId` en `POST /signup` y vale 30 minutos. Si llega `PHONE_NOT_VERIFIED`, el front vuelve a pedir el código.
- **Códigos en desarrollo:** con `EXPOSE_DEV_LOGIN_CODE=true`, las respuestas traen `devCode`, y así se prueba sin WhatsApp.
- **Errores:** las decisiones se toman con `error.code`. `error.message` ya está escrito para la persona y se puede mostrar o leer con `speak()`. `error.fields` sirve para marcar campos.
- **Listas:** `GET /catalog` trae los mismos códigos que `src/features/signup/options.ts`. Si se agrega un código en el front, también hay que agregarlo en el backend (`catalog.ts`) y crear una migración.

### Servicio de IA

El backend define una interfaz por servicio, en `src/services/`. Hoy cada una tiene una versión simulada (`mock`). Para conectar un proveedor real:

1. Implementa la interfaz en una clase nueva.
2. Agrégala al `create…Provider` correspondiente con un nombre, por ejemplo `'claude'`.
3. Suma ese nombre al enum de la variable en `src/config/env.ts` (`OCR_PROVIDER`, etc.).
4. Lee las claves desde `.env`; nunca las escribas en el código.

```ts
// src/services/ocr.ts: lectura del carnet (Google Vision, Azure Document Intelligence o un modelo con visión)
interface OcrProvider {
  readonly name: string
  readIdCard(front: IdCardImage, back: IdCardImage): Promise<OcrResult>
}
// IdCardImage = { data: Buffer; mime: 'image/jpeg' | 'image/png' | 'image/heic' | 'image/webp' | 'application/pdf' }
// OcrResult   = { provider: string, fields: IdCardFields, confidence: Record<keyof IdCardFields, number /* 0 a 1 */> }
// IdCardFields = { fullName, idNumber, birthDate: 'AAAA-MM-DD' | null, disabilityType: 'physical' | 'visual' |
//                  'hearing' | 'intellectual' | 'psychosocial' | null, disabilityPercent: number | null,
//                  validity: 'AAAA-MM-DD' | null }

// src/services/voice.ts: respaldo de dictado (Whisper, Google Speech-to-Text, Azure Speech)
interface TranscriptionProvider {
  readonly name: string
  transcribe(audio: { data: Buffer; mime: string; lang: string /* 'es-EC' */ }): Promise<{ text: string }>
}

// src/services/voice.ts: voz uniforme (Azure o Google TTS con voz neural es-EC)
interface TtsProvider {
  readonly name: string
  synthesize(input: { text: string; lang: string; rate: 0.8 | 1 | 1.25 }): Promise<{ audio: Buffer; mime: string }>
}

// src/services/messaging.ts: códigos de 4 dígitos (WhatsApp Business Cloud API, Twilio, Infobip)
interface MessagingProvider {
  readonly name: string
  sendCode(input: { phone: string; channel: 'whatsapp' | 'sms'; code: string; purpose: 'login' | 'phoneVerification' }): Promise<void>
}
```

Lo que el OCR debe cumplir:

- **Siempre devuelve todos los campos.** Si no lee uno, lo devuelve en `null` con una confianza baja; no lanza un error. Los campos con confianza menor a 0,8 se marcan para que la persona los revise.
- **Normaliza los valores:** la cédula en 10 dígitos, las fechas en ISO y el tipo con los códigos de arriba. Por ejemplo, "Física" se devuelve como `physical`.
- **No guarda las imágenes ni las usa para entrenar.** Si el proveedor lo permite, hay que desactivar la retención de datos. El proveedor también debe aparecer en la política de privacidad.
- **Necesita ejemplos reales primero:** hay que confirmar el formato real del documento (carnet CONADIS, certificado MSP o cédula) con unos 10 ejemplos anonimizados.

El **motor de match** no usa IA y debe seguir así para descartar ofertas. Si más adelante se suma un modelo de lenguaje, solo puede:

- comparar `experienceText` con la descripción del puesto para ajustar los 25 puntos de experiencia;
- redactar las razones.

Nunca debe recibir la cédula ni el porcentaje de discapacidad.

---

## Pendiente o por acordar

- **Elementos que no aparecen en los mockups y el equipo decidió mantener:** soporte de WEBP en el carnet; la opción de guardar las fotos del carnet (viene del documento; por defecto se borran); el contacto y las habilidades en "Así te verá la empresa"; los estados Contratada y Retirada; y, en el admin, editar ofertas y cambiar el estado de las postulaciones.

- **OCR real:** ver "Servicio de IA".
- **Lista de ajustes y tabla de choques:** el front tiene un TODO para acordarla. Está centralizada en `catalog.ts`.
- **Hoja de vida:** por ahora solo se guarda el nombre del archivo, igual que en el front.
- **Contenido de "Lectura fácil":** ya existe el campo `easyRead`, por secciones; falta escribir y validar los textos de cada oferta con personas con discapacidad intelectual.
