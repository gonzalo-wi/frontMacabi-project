/** Labels en español para valores del API (clave inglesa intacta para el servidor). */

export function labelInstanceType(code: string): string {
  const m: Record<string, string> = {
    activity: 'Actividad',
    custom: 'Personalizada',
  }
  return m[code] ?? code
}

export function labelInstanceStatus(code: string): string {
  const m: Record<string, string> = {
    draft: 'Borrador',
    open: 'Abierta',
    /** No acepta envíos nuevos ni cambios desde el portal (solo admin puede reabrir). */
    closed: 'Respuestas cerradas',
    cancelled: 'Cancelada',
  }
  return m[code] ?? code
}

export function labelModuleType(code: string): string {
  const m: Record<string, string> = {
    attendance: 'Asistencia',
    meal: 'Comida',
    transport: 'Transporte',
    custom: 'Personalizado',
  }
  return m[code] ?? code
}

export function labelGroupType(code: string): string {
  const m: Record<string, string> = {
    single_choice: 'Una opción',
    multiple_choice: 'Varias opciones',
    text: 'Texto libre',
    number: 'Número',
  }
  return m[code] ?? code
}
