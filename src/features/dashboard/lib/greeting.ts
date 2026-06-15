export function greetingName(fullName: string) {
  const first = fullName.trim().split(/\s+/)[0]
  return first || fullName
}

/** Fecha tipo "lunes 11 de mayo" (solo mayúscula inicial). */
export function greetingDateEsAR() {
  const s = new Intl.DateTimeFormat('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date())
  return s.charAt(0).toUpperCase() + s.slice(1)
}

/** Resumen gramatical: evita "1 proyectos" / "1 próximas". */
export function summaryLine(
  membershipsPending: boolean,
  upcomingPending: boolean,
  membershipsCount: number,
  upcomingCount: number,
): string {
  if (membershipsPending || upcomingPending) {
    return 'Cargando tus datos…'
  }
  const proy =
    membershipsCount === 0
      ? 'no tenés proyectos cargados todavía'
      : membershipsCount === 1
        ? 'integrás 1 proyecto'
        : `integrás ${membershipsCount} proyectos`
  const jor =
    upcomingCount === 0
      ? 'no hay próximas jornadas en la lista por ahora'
      : upcomingCount === 1
        ? 'hay 1 próxima jornada para revisar abajo'
        : `hay ${upcomingCount} próximas jornadas para revisar abajo`
  return `${proy.charAt(0).toUpperCase() + proy.slice(1)}; ${jor}.`
}
