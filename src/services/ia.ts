/**
 * Cliente HTTP de capaz_ia (servicio aparte que habla con Ollama).
 * Va separado para que un modelo lento o caído no tumbe la API: cada llamada tiene timeout
 * y los errores se convierten en un 503 con mensaje para la persona.
 */
import { HttpError } from '../lib/errors.js'

export interface IaClientOptions {
  baseUrl: string
  token: string
  timeoutMs: number
  /** Opcional: credenciales de Cloudflare Access para un hostname protegido con Service Auth. */
  cloudflareAccessClientId?: string
  cloudflareAccessClientSecret?: string
}

export const iaUnavailable = (message: string) => new HttpError(503, 'IA_UNAVAILABLE', message)

export class IaClient {
  constructor(private readonly opts: IaClientOptions) {}

  async post<T>(path: string, body: unknown, unavailableMessage: string, extraHeaders: Record<string, string> = {}): Promise<T> {
    let res: Response
    try {
      res = await fetch(new URL(path, this.opts.baseUrl), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.opts.token}`,
          ...(this.opts.cloudflareAccessClientId && this.opts.cloudflareAccessClientSecret
            ? {
                'CF-Access-Client-Id': this.opts.cloudflareAccessClientId,
                'CF-Access-Client-Secret': this.opts.cloudflareAccessClientSecret,
              }
            : {}),
          ...extraHeaders,
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(this.opts.timeoutMs),
      })
    } catch (err) {
      const reason = err instanceof Error ? err.name : 'unknown_error'
      throw iaUnavailable(`${unavailableMessage} (error de conexión: ${reason})`)
    }
    if (!res.ok) {
      // No registramos el cuerpo porque puede contener datos de infraestructura o credenciales.
      throw iaUnavailable(`${unavailableMessage} (IA respondió HTTP ${res.status})`)
    }
    return (await res.json()) as T
  }
}
