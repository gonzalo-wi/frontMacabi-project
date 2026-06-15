import type { ExpenseStatus } from '@/features/expenses/model/types'

/** Orden de visualización de estados de gasto (pendientes primero). */
export const EXPENSE_STATUS_ORDER: Record<ExpenseStatus, number> = {
  PENDIENTE: 0,
  APROBADO: 1,
  RECHAZADO: 2,
}

/** Fondo + borde del banner de estado en el detalle de un gasto. */
export function expenseStatusBannerClass(status: ExpenseStatus): string {
  switch (status) {
    case 'PENDIENTE': return 'border-amber-200 bg-amber-50/50 dark:border-amber-800/60 dark:bg-amber-950/20'
    case 'APROBADO':  return 'border-emerald-200 bg-emerald-50/50 dark:border-emerald-800/60 dark:bg-emerald-950/20'
    case 'RECHAZADO': return 'border-destructive/20 bg-destructive/5'
    default:          return 'border-border bg-muted/5'
  }
}

/** Opciones para el filtro de estado de gastos (incluye "todos"). */
export const EXPENSE_STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'Todos los estados' },
  { value: 'PENDIENTE', label: 'Pendiente' },
  { value: 'APROBADO', label: 'Aprobado' },
  { value: 'RECHAZADO', label: 'Rechazado' },
]
