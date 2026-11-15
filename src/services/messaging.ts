/**
 * Envío de códigos de 4 dígitos por WhatsApp o SMS (ingreso y verificación del celular).
 * Proveedores reales posibles: WhatsApp Business Cloud API, Twilio, Infobip.
 */
import type { FastifyBaseLogger } from 'fastify'
import { maskPhone } from '../domain/cedula.js'

export type Channel = 'whatsapp' | 'sms'
/** Para qué es el código (cambia el texto del mensaje) */
export type CodePurpose = 'login' | 'phoneVerification'

export interface SendCodeInput {
  /** Celular ecuatoriano, 09XXXXXXXX */
  phone: string
  channel: Channel
  /** 4 dígitos */
  code: string
  purpose: CodePurpose
}

export interface MessagingProvider {
  readonly name: string
  sendCode(input: SendCodeInput): Promise<void>
}

export const codeMessage = ({ code, purpose }: Pick<SendCodeInput, 'code' | 'purpose'>) =>
  purpose === 'login'
    ? `Tu código para ingresar a Capaz es ${code}. Vence en 10 minutos. No lo compartas.`
    : `Tu código para confirmar tu celular en Capaz es ${code}. Vence en 10 minutos.`

/** Simulado: no envía nada; escribe el mensaje en el log del servidor. */
export class MockMessagingProvider implements MessagingProvider {
  readonly name = 'mock'
  constructor(private log: FastifyBaseLogger) {}

  async sendCode(input: SendCodeInput) {
    this.log.info({ to: maskPhone(input.phone), channel: input.channel }, `[mock ${input.channel}] ${codeMessage(input)}`)
  }
}

export function createMessagingProvider(name: string, log: FastifyBaseLogger): MessagingProvider {
  switch (name) {
    case 'mock':
      return new MockMessagingProvider(log)
    default:
      throw new Error(`Proveedor de mensajería desconocido: ${name}`)
  }
}
