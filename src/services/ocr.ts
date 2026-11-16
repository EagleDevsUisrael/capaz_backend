/**
 * OCR del carnet. El documento propone Google Cloud Vision, Azure Document Intelligence o un modelo
 * con visión (p. ej. Claude) que devuelva JSON. Para el MVP hay un proveedor simulado.
 *
 * Antes de conectar uno real hay que confirmar el formato del documento (carnet CONADIS,
 * certificado MSP o cédula con la condición de discapacidad): los campos cambian entre uno y otro.
 */
import { createHash } from 'node:crypto'
import { withCheckDigit } from '../domain/cedula.js'
import type { DisabilityType } from '../domain/catalog.js'
import type { IaClient } from './ia.js'

export interface IdCardImage {
  data: Buffer
  mime: string
}

export interface IdCardFields {
  fullName: string
  idNumber: string
  /** AAAA-MM-DD */
  birthDate: string | null
  disabilityType: DisabilityType | null
  disabilityPercent: number | null
  /** AAAA-MM-DD, 'indefinite' si el carnet dice "Indefinida", o null si no se leyó */
  validity: string | 'indefinite' | null
}

export type IdCardConfidence = Record<keyof IdCardFields, number>

export interface OcrResult {
  fields: IdCardFields
  /** Confianza de 0 a 1 por campo */
  confidence: IdCardConfidence
  provider: string
}

export interface OcrProvider {
  readonly name: string
  readIdCard(front: IdCardImage, back: IdCardImage): Promise<OcrResult>
}

/**
 * Simulado: devuelve datos de ejemplo verosímiles y estables para la misma foto
 * (el hash de la imagen elige el ejemplo). El porcentaje sale con confianza baja a propósito,
 * para que el front muestre el estado "revisa este dato".
 */
export class MockOcrProvider implements OcrProvider {
  readonly name = 'mock'

  async readIdCard(front: IdCardImage): Promise<OcrResult> {
    const samples = [
      { fullName: 'María Fernanda Torres Pérez', nine: '091234567', birthDate: '1994-03-18', disabilityType: 'physical', disabilityPercent: 65 },
      { fullName: 'Luis Alberto Quishpe Caiza', nine: '171456789', birthDate: '1988-11-02', disabilityType: 'visual', disabilityPercent: 75 },
      { fullName: 'Ana Belén Mendoza Vera', nine: '130987654', birthDate: '2000-07-25', disabilityType: 'hearing', disabilityPercent: 50 },
    ] as const
    const h = createHash('sha256').update(front.data).digest()
    const s = samples[h[0]! % samples.length]!
    return {
      provider: this.name,
      fields: {
        fullName: s.fullName,
        idNumber: withCheckDigit(s.nine),
        birthDate: s.birthDate,
        disabilityType: s.disabilityType,
        disabilityPercent: s.disabilityPercent,
        validity: 'indefinite',
      },
      confidence: {
        fullName: 0.97,
        idNumber: 0.95,
        birthDate: 0.92,
        disabilityType: 0.9,
        disabilityPercent: 0.62,
        validity: 0.9,
      },
    }
  }
}

/**
 * OCR con capaz_ia (Ollama con un modelo de visión). Si la IA no responde NO se usa el simulado:
 * mostraría datos de otra persona. Se responde 503 y el front ofrece escribir los datos a mano.
 */
export class IaOcrProvider implements OcrProvider {
  readonly name = 'ia'

  constructor(private readonly ia: IaClient) {}

  async readIdCard(front: IdCardImage, back: IdCardImage): Promise<OcrResult> {
    const img = (i: IdCardImage) => ({ data: i.data.toString('base64'), mime: i.mime })
    const r = await this.ia.post<{ provider: string; fields: IdCardFields; confidence: IdCardConfidence }>(
      '/v1/id-card/read',
      { front: img(front), back: img(back) },
      'No pudimos leer tu carnet en este momento. Puedes escribir tus datos a mano.',
    )
    return { fields: r.fields, confidence: r.confidence, provider: r.provider }
  }
}

export function createOcrProvider(name: string, ia?: IaClient): OcrProvider {
  switch (name) {
    case 'mock':
      return new MockOcrProvider()
    case 'ia':
      if (!ia) throw new Error('OCR_PROVIDER=ia necesita IA_SERVICE_URL e IA_SERVICE_TOKEN')
      return new IaOcrProvider(ia)
    default:
      throw new Error(`Proveedor de OCR desconocido: ${name}`)
  }
}

/** Campos con confianza menor a esto se marcan para que la persona los revise. */
export const LOW_CONFIDENCE = 0.8
