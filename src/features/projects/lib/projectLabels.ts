/** Labels en español para roles de proyecto (clave inglesa intacta para el servidor). */

export function labelProjectRole(code: string): string {
  const m: Record<string, string> = {
    coordinator: 'Coordinador',
    madrij: 'Madrijím',
  }
  return m[code] ?? code
}
