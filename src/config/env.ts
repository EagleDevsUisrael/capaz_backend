import 'dotenv/config'
import { z } from 'zod'

const bool = z
  .enum(['true', 'false', '1', '0', ''])
  .optional()
  .transform((v) => v === 'true' || v === '1')

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().default(3000),
  HOST: z.string().default('0.0.0.0'),

  /** Pooler de Supabase (puerto 6543, ?pgbouncer=true). La usa la app. */
  DATABASE_URL: z.string().min(1, 'Falta DATABASE_URL (ver .env.example)'),

  /** Orígenes del front permitidos para CORS, separados por coma. Vacío o sin definir → Vite local. */
  CORS_ORIGINS: z
    .string()
    .optional()
    .transform((v) => {
      const list = (v ?? '').split(',').map((s) => s.trim().replace(/\/+$/, '')).filter(Boolean)
      return list.length ? list : ['http://localhost:5173']
    }),
  /** URL pública del front, para armar el enlace del QR "Continuar en el celular" */
  PUBLIC_WEB_URL: z.string().default('http://localhost:5173'),

  /** Clave AES-256 en base64 para cifrar las fotos del carnet y la hoja de vida (ver .env.example) */
  ID_CARD_ENCRYPTION_KEY: z.string().min(1, 'Falta ID_CARD_ENCRYPTION_KEY (ver .env.example)'),

  /** Token del admin de demostración (cabecera `Authorization: Bearer <token>` en /api/admin/*) */
  ADMIN_TOKEN: z.string().min(12, 'ADMIN_TOKEN debe tener al menos 12 caracteres'),

  /** Versión de la política de privacidad que se registra con cada consentimiento */
  PRIVACY_POLICY_VERSION: z.string().default('2026-11-draft'),

  SESSION_TTL_DAYS: z.coerce.number().int().positive().default(30),

  /** Proveedores externos. "mock" = simulado (demo). */
  /** "ia" = capaz_ia (Ollama). Necesita IA_SERVICE_URL e IA_SERVICE_TOKEN. */
  OCR_PROVIDER: z.enum(['mock', 'ia']).default('mock'),

  /** Servicio capaz_ia. Sin token, las funciones de IA quedan desactivadas (503). */
  IA_SERVICE_URL: z.string().url().default('http://localhost:4000'),
  IA_SERVICE_TOKEN: z.string().optional().transform((v) => v || undefined),
  IA_TIMEOUT_MS: z.coerce.number().int().positive().default(45000),
  MESSAGING_PROVIDER: z.enum(['mock']).default('mock'),
  TRANSCRIBE_PROVIDER: z.enum(['mock']).default('mock'),
  TTS_PROVIDER: z.enum(['mock']).default('mock'),

  /** Solo desarrollo: devuelve el código de ingreso en la respuesta para probar sin WhatsApp/SMS */
  EXPOSE_DEV_LOGIN_CODE: bool,
  /**
   * Instancia de DEMOSTRACIÓN publicada (p. ej. en Render): permite EXPOSE_DEV_LOGIN_CODE con NODE_ENV=production
   * para mostrar el código en pantalla sin WhatsApp/SMS. Nunca en un despliegue con personas reales.
   */
  DEMO_MODE: bool,
})

// Variables vacías (p. ej. copiadas de .env.example) cuentan como no definidas: así aplican los valores por defecto
const defined = Object.fromEntries(Object.entries(process.env).filter(([, v]) => v !== undefined && v.trim() !== ''))
const parsed = schema.safeParse(defined)
if (!parsed.success) {
  console.error('Variables de entorno inválidas:\n' + z.prettifyError(parsed.error))
  process.exit(1)
}
if (parsed.data.NODE_ENV === 'production' && parsed.data.EXPOSE_DEV_LOGIN_CODE && !parsed.data.DEMO_MODE) {
  console.error('EXPOSE_DEV_LOGIN_CODE no puede estar activo en producción (salvo DEMO_MODE=true en una demo)')
  process.exit(1)
}
if (parsed.data.DEMO_MODE) console.warn('⚠ DEMO_MODE activo: los códigos de ingreso se muestran en pantalla.')

export const env = parsed.data
export type Env = typeof env
