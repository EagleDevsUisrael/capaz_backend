/**
 * Errores de la API. Formato de respuesta:
 *   { "error": { "code": "INVALID_CODE", "message": "texto en español para la persona", "fields": {...}? } }
 * `code` es estable (el front decide con él); `message` se puede mostrar y leer en voz alta.
 */
export class HttpError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public fields?: Record<string, string>,
  ) {
    super(message)
  }
}

export const badRequest = (code: string, message: string, fields?: Record<string, string>) =>
  new HttpError(400, code, message, fields)
export const unauthorized = (message = 'Necesitas ingresar con tu cédula para ver esto.') =>
  new HttpError(401, 'UNAUTHORIZED', message)
export const forbidden = (message = 'No tienes permiso para hacer esto.') => new HttpError(403, 'FORBIDDEN', message)
export const notFound = (message = 'No encontramos lo que buscas.') => new HttpError(404, 'NOT_FOUND', message)
export const conflict = (code: string, message: string) => new HttpError(409, code, message)
export const unprocessable = (code: string, message: string, fields?: Record<string, string>) =>
  new HttpError(422, code, message, fields)
export const gone = (code: string, message: string) => new HttpError(410, code, message)
export const tooMany = (message = 'Hiciste muchos intentos. Espera un momento y vuelve a intentarlo.') =>
  new HttpError(429, 'TOO_MANY_REQUESTS', message)
