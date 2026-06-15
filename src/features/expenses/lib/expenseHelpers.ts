import type { ExpenseStatus } from '@/features/expenses/model/types'

/** Fecha de gasto (date-only "YYYY-MM-DD") como dd/mm/aa, sin corrimiento de zona. */
export function formatExpenseDateShort(iso: string): string {
  return new Date(`${iso}T12:00:00`).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  })
}

/** Borde izquierdo de la fila de gasto según estado. */
export function expenseStatusBorderClass(status: ExpenseStatus): string {
  switch (status) {
    case 'APROBADO':
      return 'border-l-emerald-500 dark:border-l-emerald-600'
    case 'RECHAZADO':
      return 'border-l-red-400 dark:border-l-red-600'
    default:
      return 'border-l-amber-400 dark:border-l-amber-500'
  }
}
