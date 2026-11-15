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
  /** AAAA-MM-DD, o null si es indefinida o no se leyó */
  validity: string | null
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
        validity: null,
      },
      confidence: {
        fullName: 0.97,
        idNumber: 0.95,
        birthDate: 0.92,
        disabilityType: 0.9,
        disabilityPercent: 0.62,
        validity: 0.4,
      },
    }
  }
}

export function createOcrProvider(name: string): OcrProvider {
  switch (name) {
    case 'mock':
      return new MockOcrProvider()
    default:
      throw new Error(`Proveedor de OCR desconocido: ${name}`)
  }
}

/** Campos con confianza menor a esto se marcan para que la persona los revise. */
export const LOW_CONFIDENCE = 0.8
