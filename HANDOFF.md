# HANDOFF: capaz_backend

Guía para integrar el backend con el front (capaz_front) y el servicio de IA, y para seguir modificándolo.
Lo que dice este archivo está verificado contra el código de `main`. El detalle de cada endpoint está en el [README](README.md) y en [`openapi.json`](openapi.json).

**Estado actual:**

- La API del MVP está completa, con 48 rutas y 32 pruebas que pasan.
- Hay dos migraciones: `0001_init` y `0002_ajustes_mockups`.
- **Todavía no se ha probado contra un Supabase real.**
- Los servicios externos (OCR, WhatsApp/SMS, transcripción y voz) están **simulados**.

---

## 1. Cómo correrlo

**Requisitos:** Node.js 22 o superior (se probó con Node 24) y npm. Para las pruebas no hace falta Docker ni Postgres instalado: usan un Postgres en memoria (PGlite).

```bash
npm install                  # instala dependencias y genera el cliente de Prisma (postinstall)
cp .env.example .env         # luego completa los valores (abajo)
npm run db:migrate           # aplica las migraciones pendientes en Supabase (usa DIRECT_URL)
npm run db:seed              # opcional: carga 11 ofertas de ejemplo si la tabla está vacía
npm run dev                  # http://localhost:3000, con recarga automática
```

> Con npm 11, la primera instalación puede avisar que bloqueó los scripts de instalación de `prisma`, `@prisma/engines` y `esbuild`. Ya están aprobados en `package.json` (`allowScripts`). Si npm vuelve a avisar, ejecuta `npm install-scripts approve <paquete>`.

**Variables del `.env`.** Se validan al arrancar en `src/config/env.ts`; si falta una obligatoria, la API no arranca y dice cuál.

| Variable | Obligatoria | Qué es |
|---|---|---|
| `DATABASE_URL` | Sí | Conexión que usa la API: el **transaction pooler** de Supabase (puerto 6543) con `?pgbouncer=true` (ver sección 2) |
| `DIRECT_URL` | Para migrar | Conexión que usan `npm run db:migrate` y la CLI de Prisma: la **directa** o el **session pooler** (puerto 5432) |
| `ID_CARD_ENCRYPTION_KEY` | Sí | Clave AES-256 (32 bytes en base64). Cifra las fotos del carnet **y** la hoja de vida. **Si se pierde o se cambia, lo ya guardado no se puede leer.** |
| `ADMIN_TOKEN` | Sí | Token del admin de demostración, de al menos 12 caracteres. Se manda como `Authorization: Bearer <token>` en `/api/admin/*` |
| `NODE_ENV` | No | `development` (por defecto), `test` o `production`. En producción se apaga `/docs` |
| `PORT` / `HOST` | No | Por defecto `3000` y `0.0.0.0` |
| `CORS_ORIGINS` | No | Orígenes del front que pueden llamar a la API, separados por coma. Vacío o sin definir: `http://localhost:5173` |
| `PUBLIC_WEB_URL` | No | URL pública del front. Con ella se arma el enlace del QR "Continuar en el celular" |
| `SESSION_TTL_DAYS` | No | Duración de la sesión en días (por defecto 30) |
| `PRIVACY_POLICY_VERSION` | No | Versión de la política que se guarda con cada consentimiento (por defecto `2026-11-draft`) |
| `OCR_PROVIDER`, `MESSAGING_PROVIDER`, `TRANSCRIBE_PROVIDER`, `TTS_PROVIDER` | No | Proveedor de cada servicio externo. Hoy solo existe `mock` (sección 4) |
| `EXPOSE_DEV_LOGIN_CODE` | No | `true` solo en desarrollo: las respuestas traen el código de 4 dígitos como `devCode`. **La API no arranca si está activo con `NODE_ENV=production`.** |

Generar la clave de cifrado y el token del admin:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

```bash
node -e "console.log(require('crypto').randomBytes(24).toString('base64url'))"
```

El primer comando da la clave de cifrado y el segundo, el token del admin. Guárdalos en un gestor de contraseñas: el `.env` nunca se sube al repositorio, porque está en `.gitignore`.

**Otros comandos:**

| Comando | Qué hace |
|---|---|
| `npm test` | Todas las pruebas (unitarias, integración y migraciones), contra un Postgres en memoria. No necesita `.env` |
| `npm run typecheck` | Revisión de tipos |
| `npm run build` y luego `npm start` | Compila a `dist/` y lo corre (producción) |
| `npm run db:migrate -- status` | Muestra qué migraciones están aplicadas y cuáles faltan, sin aplicar nada |
| `npm run openapi` | Regenera `openapi.json` |

**Documentación interactiva:** con `npm run dev`, abre `http://localhost:3000/docs`. Ahí se pueden probar los endpoints. No existe con `NODE_ENV=production`.

---

## 2. Base de datos (Supabase)

### Un solo camino para crear la base: aplicar las migraciones en orden

Crea la base **solo** aplicando las migraciones de `database/migrations/` en orden: `0001_init.sql`, `0002_ajustes_mockups.sql` y las que vengan. Así la tabla `schema_migrations` siempre dice cuáles ya están aplicadas, y las siguientes (0003…) entran sin problemas.

Hay dos formas equivalentes, y se pueden mezclar:

- **Terminal:** completa `DIRECT_URL` en `.env` y ejecuta `npm run db:migrate`. Aplica las pendientes en orden y se salta las que ya están.
- **SQL Editor de Supabase:** pega el contenido de **una** migración → Run. Luego la siguiente, en orden.

Cada migración:

- corre en **una sola transacción**: si algo falla, no se aplica nada;
- se registra en `schema_migrations`;
- **se niega a correr** si ya se aplicó o si falta la anterior. Pegarla dos veces no rompe nada.

> **No uses `database/schema.sql` para crear la base.** Es una foto del estado completo: sirve de referencia, y una prueba la usa para comprobar que las migraciones dan exactamente esa base. Tampoco uses `prisma db push` ni `prisma migrate dev` contra Supabase: no conocen las reglas extra del esquema (RLS, `CHECK` y triggers).

Para comprobar que quedó bien:
- `npm run db:migrate -- status` debe marcar todas como aplicadas;
- `SELECT * FROM schema_migrations ORDER BY version;` en el SQL Editor debe listarlas;
- en *Table Editor*, todas las tablas deben tener el candado de RLS.

### Regla de oro

**Una migración que ya se aplicó en Supabase nunca se edita.** Si hay que corregirla, se crea otra nueva.

### Cómo crear la siguiente migración

1. Cambia el modelo en [`prisma/schema.prisma`](prisma/schema.prisma). Si cambian los códigos de una lista (habilidades, ajustes, exigencias, provincias), cámbialos en [`src/domain/catalog.ts`](src/domain/catalog.ts).
2. **Avisa al equipo** que vas a crear la migración siguiente (sección 8).
3. Ejecuta `npm run db:migration -- nombre_en_snake_case`. Crea `database/migrations/000N_nombre.sql` comparando el modelo actual con el de la última migración, que está guardado en `database/.snapshot/`. El archivo incluye:
   - el SQL que genera Prisma: tablas, columnas, enums, índices y llaves;
   - el reemplazo de los `CHECK` de catálogo que cambiaron;
   - RLS para las tablas nuevas.

   También se regeneran `database/schema.sql` y el snapshot.
4. **Revisa el SQL a mano antes del commit.**
   - Prisma no detecta renombres: los convierte en borrar y crear, y eso pierde datos.
   - Prisma tampoco rellena una columna nueva obligatoria en una tabla con filas.
   - Las reglas que no salen del modelo hay que escribirlas a mano en la migración **y** en `scripts/db/lib.ts`, para que `schema.sql` también las tenga. Por ejemplo, los `CHECK` de rango y los triggers. La 0002 lo hace con `jobs_daily_hours_range` y `cv_files_size_range`.
5. Ejecuta `npm test`. La prueba `las migraciones en orden equivalen a schema.sql` falla si la migración y `schema.sql` no coinciden.
6. Haz commit de `prisma/schema.prisma`, la migración nueva, `database/.snapshot/` y `database/schema.sql`. Abre el PR y avisa para que se aplique.

Si solo hace falta regenerar `schema.sql`, ejecuta `npm run db:sql`. No crea ninguna migración.

### URLs de Supabase

Están en Supabase → **Connect** (o *Project Settings → Database*). Reemplaza `[YOUR-PASSWORD]`; si la contraseña tiene caracteres especiales, codifícalos (`@` → `%40`).

| Variable | Conexión | Ejemplo |
|---|---|---|
| `DATABASE_URL` | **Transaction pooler**, puerto **6543**, con `?pgbouncer=true` | `postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres?pgbouncer=true` |
| `DIRECT_URL` | **Conexión directa**, que solo funciona con IPv6, **o session pooler**, puerto **5432** | `postgresql://postgres:<password>@db.<ref>.supabase.co:5432/postgres` o `postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres` |

El parámetro `pgbouncer=true` es una convención de Prisma. El backend lo quita antes de conectar con `pg` (en `src/lib/prisma.ts`), y una prueba lo verifica. El backend entra con el rol `postgres`; no uses las claves `anon` ni `service_role` en ningún lado.

---

## 3. Conexión con el front

- **URL base:** `http://localhost:3000/api` en desarrollo. En el front conviene una variable como `VITE_API_URL`.
- **CORS:** el origen del front tiene que estar en `CORS_ORIGINS`, separado por comas si son varios. Por defecto se acepta `http://localhost:5173`, que es Vite. Los encabezados permitidos son `Content-Type` y `Authorization`.
- **Pantallas y endpoints:** la tabla que cruza cada pantalla del front con su endpoint está en el [README, sección "Contrato de la API"](README.md#contrato-de-la-api). La sección "Para el equipo → Front" explica la sesión, el login y los errores.
- **Contrato:** está en [`openapi.json`](openapi.json) y en `/docs`. Los tipos del front se pueden generar con `openapi-typescript openapi.json`. **Si cambias un endpoint, ejecuta `npm run openapi` y haz commit del `openapi.json` actualizado en el mismo PR.**
- **Sesión:** `POST /api/signup` y `POST /api/auth/verify` devuelven un `token`. Se manda como `Authorization: Bearer <token>`; un 401 significa que hay que ingresar de nuevo.
- **Errores:** siempre tienen la forma `{ error: { code, message, fields? } }`. El front decide con `code`; `message` ya está en español para la persona.
- **Listas de opciones:** `GET /api/catalog` trae los mismos códigos que `src/features/signup/options.ts` del front. Si se agrega un código, hay que agregarlo en los dos lados y crear una migración.

---

## 4. Conexión con la IA y servicios externos

Hay **cuatro servicios simulados**. Cada uno está detrás de una interfaz, y `src/app.ts` elige la implementación según la variable de entorno. El resto del código solo usa la interfaz (`app.services.ocr`, `app.services.messaging`, etc.), así que cambiar el simulado por el real no toca rutas ni lógica.

| Servicio | Archivo | Interfaz y método | Recibe | Devuelve | Simulado hoy |
|---|---|---|---|---|---|
| OCR del carnet | [`src/services/ocr.ts`](src/services/ocr.ts) | `OcrProvider.readIdCard(front, back)` | dos `IdCardImage`: `{ data: Buffer, mime }`. El `mime` lo detecta el backend por los primeros bytes: JPG, PNG, HEIC, WEBP o PDF | `OcrResult`: `{ provider, fields, confidence }`. `fields` trae `{ fullName, idNumber, birthDate, disabilityType, disabilityPercent, validity }` y `confidence` va de 0 a 1 por campo | Datos de ejemplo. El porcentaje sale con confianza baja |
| Código por WhatsApp/SMS | [`src/services/messaging.ts`](src/services/messaging.ts) | `MessagingProvider.sendCode(input)` | `{ phone: '09XXXXXXXX', channel: 'whatsapp' \| 'sms', code: '1234', purpose: 'login' \| 'phoneVerification' }` | `Promise<void>`; debe lanzar un error si el envío falla | Escribe el mensaje en el log del servidor |
| Transcripción (respaldo del dictado) | [`src/services/voice.ts`](src/services/voice.ts) | `TranscriptionProvider.transcribe(audio)` | `{ data: Buffer, mime, lang: 'es-EC' }` (el front graba hasta 30 s) | `{ text }` | Texto fijo |
| Voz (TTS) | [`src/services/voice.ts`](src/services/voice.ts) | `TtsProvider.synthesize(input)` | `{ text, lang: 'es-EC', rate: 0.8 \| 1 \| 1.25 }` | `{ audio: Buffer, mime }` | Un WAV en silencio |

**Reglas del OCR:**

- **Siempre devuelve todos los campos.** Si no lee uno, lo devuelve en `null` con una confianza baja; no lanza un error. Los campos con confianza menor a `LOW_CONFIDENCE` (0,8) se marcan para que la persona los revise.
- **Normaliza los valores:**
  - la cédula, en 10 dígitos;
  - las fechas, en `AAAA-MM-DD`;
  - la vigencia "Indefinida", como `'indefinite'`;
  - el tipo de discapacidad, como `physical`, `visual`, `hearing`, `intellectual` o `psychosocial`.
- **No guarda las imágenes ni las usa para entrenar.** Si el proveedor lo permite, hay que desactivar la retención de datos.

**Cómo cambiar un simulado por el real** (ejemplo con el OCR):

1. En `src/services/ocr.ts`, crea una clase que implemente `OcrProvider`, por ejemplo `class ClaudeOcrProvider implements OcrProvider { readonly name = 'claude'; async readIdCard(front, back) { … } }`.
2. Agrégala al `switch` de `createOcrProvider` con `case 'claude': return new ClaudeOcrProvider(...)`.
3. En `src/config/env.ts`, suma el nombre al enum de la variable: `OCR_PROVIDER: z.enum(['mock', 'claude'])`. Si necesita una clave de API, agrégala ahí como variable nueva, y también en `.env.example`, **vacía**.
4. Pon `OCR_PROVIDER=claude` en el `.env`.

Los servicios de mensajería (`createMessagingProvider`), transcripción (`createTranscriptionProvider`) y voz (`createTtsProvider`) se cambian igual.

**Pruebas sin red:** `buildApp({ db, config, services: { ocr: miProviderFalso } })` acepta implementaciones propias. Así se puede probar sin llamar al proveedor real.

---

## 5. Motor de match

- **Reglas y puntaje:** [`src/domain/matchEngine.ts`](src/domain/matchEngine.ts). El motor es solo reglas, sin modelo de lenguaje.
  - **Etapa 1, descarte (0 %):** la discapacidad no es compatible, o un ajuste choca con una exigencia del puesto.
  - **Etapa 2, puntaje:** discapacidad 40, ajustes cubiertos 30 (15 si la persona no marcó ninguno), experiencia 25 y estudios 5. Se recomienda desde 70 (`RECOMMEND_THRESHOLD`).
- **Catálogo de choques:** [`src/domain/catalog.ts`](src/domain/catalog.ts).
  - `CLASHES` dice qué exigencias choca cada ajuste que necesita la persona: `seated` con `walkingDriving` y `standing`; `screenReader` con `seeScreen`; `signLanguage` con `phoneSpeaking` y `hearing`; `adaptedKeyboard` con `bothHands`.
  - `CLASH_RESOLVED_IF_OFFERED` lista los choques que desaparecen si la oferta ofrece ese mismo ajuste: `screenReader`, `signLanguage` y `adaptedKeyboard`.
  - En el mismo archivo están las etiquetas, las razones de cada ajuste (`offeredReason`) y las palabras de cada habilidad (`SKILL_TERMS` está en `matchEngine.ts`).
- **Pruebas que lo cubren:**
  - [`src/domain/domain.test.ts`](src/domain/domain.test.ts): el ejemplo del documento (desarrollador backend con más de 90 % y conductor descartado por "caminar o conducir"), descarte por discapacidad, choque resuelto por lector de pantalla, 15 de 30 sin ajustes, aviso de ciudad, umbral de 70 y razones sin género.
  - [`src/api.test.ts`](src/api.test.ts): "recomendaciones /for-you", orden por compatibilidad, "admin: probar match rápido" y ofertas parecidas.
- Si se suma un modelo de lenguaje, **solo** puede ajustar los 25 puntos de experiencia y redactar razones. **Nunca descarta ofertas** y nunca recibe la cédula ni el porcentaje de discapacidad.

---

## 6. Decisiones de privacidad que no deben romperse

| Decisión | Dónde está | Cómo se protege |
|---|---|---|
| **RLS activado sin políticas** en todas las tablas. Nadie lee datos con las claves `anon` o `authenticated` de Supabase; el backend entra como `postgres` | Migraciones; `scripts/db/lib.ts` (`enableRls`) | El generador agrega RLS a las tablas nuevas. La prueba de equivalencia de migraciones lo comprueba |
| **Carnet y hoja de vida cifrados** con AES-256-GCM | `src/lib/crypto.ts`, usado en `src/modules/idCard.ts` y `src/modules/cv.ts` | Pruebas de traspaso al celular y de hoja de vida (se descifran igual) |
| **Fotos del carnet borradas al confirmar el registro.** `keepIdCardImages` está apagado por defecto y solo se guardan si la persona lo activa | `src/modules/signup.ts`, `privacyData` en `src/modules/schemas.ts` | Prueba "registro completo": las fotos quedan en `null` |
| **Consentimientos guardados con fecha**, versión de la política, IP y navegador, incluido cada cambio posterior | `recordConsents` en `src/lib/sessions.ts`, tabla `consent_records` | Pruebas de registro y de perfil |
| **El login responde igual exista o no la cédula** (202 con el mismo mensaje), para no revelar quién está registrado en una plataforma de discapacidad | `POST /api/auth/code` en `src/modules/auth.ts` | Prueba "ingreso sin contraseña" |
| **Razones del match sin género** ("Trabajo sentado, desde casa", "Usas Excel, como en tu último trabajo") | `src/domain/matchEngine.ts`, `offeredReason` en `catalog.ts` | Prueba "las razones no tienen género" |

Además:

- La empresa nunca ve el carnet ni la cédula, y ve el tipo y el porcentaje de discapacidad solo si la persona lo autoriza.
- Tokens, códigos y enlaces del QR se guardan solo como hash.
- El admin solo ve candidatos de prueba.
- Las pruebas son la red de seguridad: si cambias algo de esta tabla y una prueba falla, revisa la decisión con el equipo antes de cambiar la prueba.

---

## 7. Pendientes

- **Guardar las fotos del carnet: el documento se contradice.** En "Captura del carnet" dice que las fotos se borran al confirmar los datos *salvo que la persona acepte guardarlas*. En "Privacidad" dice solo que *se borran después de confirmar los datos*. El backend implementa la opción, apagada por defecto, y **falta que el equipo decida** si se mantiene.
- **Validar los choques del catálogo** (`CLASHES` en `catalog.ts`) con el equipo y, de ser posible, con personas con discapacidad y con empresas. El front también tiene un TODO para acordar la lista de ajustes.
- **El backend no se ha probado contra Supabase real.** Las pruebas usan un Postgres 17 en memoria. Al crear la base, hay que aplicar las migraciones, cargar el seed y recorrer un registro completo desde el front.
- **Reemplazar los servicios simulados antes de la demo**: OCR, WhatsApp/SMS, transcripción y voz (sección 4). Para el OCR, antes hay que confirmar el formato real del documento (carnet CONADIS, certificado MSP o cédula) con unos 10 ejemplos anonimizados.
- Otros, que también están en el README: los textos de lectura fácil de cada oferta, las invitaciones de empresas (portal fuera del MVP) y la revisión legal de la política de privacidad.

---

## 8. Cómo trabajar sin conflictos

1. **Antes de empezar**, actualiza `main`:

   ```bash
   git checkout main
   ```

   ```bash
   git pull
   ```

2. **Cada cambio va en su propia rama** (`feature/…`, `fix/…`, `docs/…`) y entra a `main` por **PR**, fusionado con **merge commit**. Nada de squash ni rebase al fusionar. No se hace push directo a `main`.
3. Antes de abrir el PR, ejecuta `npm test` y `npm run typecheck`. Si cambiaste endpoints, ejecuta `npm run openapi`.
4. **Avisa antes de crear una migración nueva** (por ejemplo: "voy a crear la 0003"), para que dos personas no generen el mismo número. Si pasa igual, la segunda persona borra su archivo, hace `git pull` y lo vuelve a generar sobre la migración que ya entró.
5. Después de fusionar, se borra la rama en GitHub y en local.
6. Nunca se sube el `.env` ni ninguna clave. Las claves nuevas van vacías en `.env.example`.
