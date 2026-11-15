/**
 * Respaldos de voz en el servidor (documento, "Stack React y librerías"):
 *  - POST /api/transcribe: para navegadores sin SpeechRecognition (Firefox). Real: Whisper, Google Speech-to-Text o Azure Speech.
 *  - POST /api/tts: voz uniforme en todos los dispositivos. Real: Azure o Google TTS con voz neural es-EC (cobra por carácter).
 */

export interface TranscriptionProvider {
  readonly name: string
  transcribe(audio: { data: Buffer; mime: string; lang: string }): Promise<{ text: string }>
}

export interface TtsProvider {
  readonly name: string
  synthesize(input: { text: string; lang: string; rate: number }): Promise<{ audio: Buffer; mime: string }>
}

/** Simulado: devuelve un texto fijo para que el flujo de dictado se pueda probar de punta a punta. */
export class MockTranscriptionProvider implements TranscriptionProvider {
  readonly name = 'mock'
  async transcribe() {
    return { text: 'texto de prueba dictado' }
  }
}

/** Simulado: devuelve un WAV de silencio (0,5 s) con la duración aproximada del texto. */
export class MockTtsProvider implements TtsProvider {
  readonly name = 'mock'
  async synthesize({ text, rate }: { text: string; rate: number }) {
    const sampleRate = 8000
    const seconds = Math.min(30, Math.max(0.5, (text.length / 15) / rate))
    return { audio: silentWav(Math.round(sampleRate * seconds), sampleRate), mime: 'audio/wav' }
  }
}

function silentWav(samples: number, sampleRate: number): Buffer {
  const dataSize = samples * 2
  const b = Buffer.alloc(44 + dataSize)
  b.write('RIFF', 0)
  b.writeUInt32LE(36 + dataSize, 4)
  b.write('WAVE', 8)
  b.write('fmt ', 12)
  b.writeUInt32LE(16, 16)
  b.writeUInt16LE(1, 20) // PCM
  b.writeUInt16LE(1, 22) // mono
  b.writeUInt32LE(sampleRate, 24)
  b.writeUInt32LE(sampleRate * 2, 28)
  b.writeUInt16LE(2, 32)
  b.writeUInt16LE(16, 34)
  b.write('data', 36)
  b.writeUInt32LE(dataSize, 40)
  return b
}

export function createTranscriptionProvider(name: string): TranscriptionProvider {
  if (name === 'mock') return new MockTranscriptionProvider()
  throw new Error(`Proveedor de transcripción desconocido: ${name}`)
}

export function createTtsProvider(name: string): TtsProvider {
  if (name === 'mock') return new MockTtsProvider()
  throw new Error(`Proveedor de TTS desconocido: ${name}`)
}
