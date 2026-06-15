// Presets de rango de fechas (Desde/Hasta) compartidos por las vistas de gastos.
// Los valores se calculan una vez al cargar el módulo (suficiente para esta app).

export type DatePreset = { label: string; desde: string; hasta: string }

/** Formatea una fecha local como 'YYYY-MM-DD' (sin corrimiento de zona horaria). */
function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const _now = new Date()

/** Default = mes actual (primer día → hoy). */
export const DEFAULT_DESDE = isoDate(new Date(_now.getFullYear(), _now.getMonth(), 1))
export const DEFAULT_HASTA = isoDate(_now)

export const DATE_PRESETS: DatePreset[] = [
  {
    label: 'Este mes',
    desde: isoDate(new Date(_now.getFullYear(), _now.getMonth(), 1)),
    hasta: isoDate(_now),
  },
  {
    label: 'Mes anterior',
    desde: isoDate(new Date(_now.getFullYear(), _now.getMonth() - 1, 1)),
    hasta: isoDate(new Date(_now.getFullYear(), _now.getMonth(), 0)),
  },
  {
    label: 'Últimos 6 meses',
    desde: isoDate(new Date(_now.getFullYear(), _now.getMonth() - 5, 1)),
    hasta: isoDate(_now),
  },
  {
    label: 'Este año',
    desde: isoDate(new Date(_now.getFullYear(), 0, 1)),
    hasta: isoDate(_now),
  },
]
