/**
 * Validación de la cédula ecuatoriana (persona natural):
 * 10 dígitos, provincia 01–24 o 30 (ecuatorianos en el exterior), tercer dígito menor que 6
 * y dígito verificador con el algoritmo de módulo 10 (coeficientes 2,1,2,1,2,1,2,1,2).
 */
export function isValidCedula(value: string): boolean {
  if (!/^\d{10}$/.test(value)) return false
  const province = Number(value.slice(0, 2))
  if (!((province >= 1 && province <= 24) || province === 30)) return false
  if (Number(value[2]) >= 6) return false

  let sum = 0
  for (let i = 0; i < 9; i++) {
    let d = Number(value[i]) * (i % 2 === 0 ? 2 : 1)
    if (d > 9) d -= 9
    sum += d
  }
  const check = (10 - (sum % 10)) % 10
  return check === Number(value[9])
}

/** Calcula el dígito verificador para 9 dígitos (útil para generar cédulas de prueba). */
export function withCheckDigit(nine: string): string {
  let sum = 0
  for (let i = 0; i < 9; i++) {
    let d = Number(nine[i]) * (i % 2 === 0 ? 2 : 1)
    if (d > 9) d -= 9
    sum += d
  }
  return nine + String((10 - (sum % 10)) % 10)
}

/** "0912345678" → "09******78" (para registros y mensajes). */
export const maskCedula = (v: string) => `${v.slice(0, 2)}******${v.slice(-2)}`

/** "0998765432" → "******5432" */
export const maskPhone = (v: string) => `******${v.slice(-4)}`
