import type { ExpenseStatus } from '@/features/expenses/model/types'
import type { RequestStatus } from '@/features/stock/model/types'

/** Orden de visualización de estados de gasto (pendientes primero). */
export const EXPENSE_STATUS_ORDER: Record<ExpenseStatus, number> = {
  PENDIENTE: 0,
  APROBADO: 1,
  RECHAZADO: 2,
}

/** Orden de visualización de estados de pedido de stock. */
export const REQUEST_STATUS_ORDER: Record<RequestStatus, number> = {
  PENDIENTE: 0,
  RESERVADO: 1,
  ENTREGADO: 2,
  DEVUELTO: 3,
  RECHAZADO: 4,
}

/** Opciones para el filtro de estado de gastos (incluye "todos"). */
export const EXPENSE_STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'Todos los estados' },
  { value: 'PENDIENTE', label: 'Pendiente' },
  { value: 'APROBADO', label: 'Aprobado' },
  { value: 'RECHAZADO', label: 'Rechazado' },
]

/** Opciones para el filtro de estado de pedidos de stock (incluye "todos"). */
export const REQUEST_STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'Todos los estados' },
  { value: 'PENDIENTE', label: 'Pendiente' },
  { value: 'RESERVADO', label: 'Reservado' },
  { value: 'ENTREGADO', label: 'Entregado' },
  { value: 'DEVUELTO', label: 'Devuelto' },
  { value: 'RECHAZADO', label: 'Rechazado' },
]
