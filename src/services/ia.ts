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
}

export const iaUnavailable = (message: string) => new HttpError(503, 'IA_UNAVAILABLE', message)

export class IaClient {
  constructor(private readonly opts: IaClientOptions) {}

  async post<T>(path: string, body: unknown, unavailableMessage: string): Promise<T> {
    let res: Response
    try {
      res = await fetch(new URL(path, this.opts.baseUrl), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.opts.token}` },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(this.opts.timeoutMs),
      })
    } catch {
      throw iaUnavailable(unavailableMessage)
    }
    if (!res.ok) throw iaUnavailable(unavailableMessage)
    return (await res.json()) as T
  }
}
