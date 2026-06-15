import type { RequestStatus } from '@/features/stock/model/types'

/** Orden de visualización de estados de pedido de stock. */
export const REQUEST_STATUS_ORDER: Record<RequestStatus, number> = {
  PENDIENTE: 0,
  RESERVADO: 1,
  ENTREGADO: 2,
  DEVUELTO: 3,
  RECHAZADO: 4,
}

/** Clase de borde izquierdo por estado de pedido de stock (lista admin/coordinador). */
export function requestStatusBorderClass(status: RequestStatus): string {
  switch (status) {
    case 'PENDIENTE': return 'border-l-amber-400'
    case 'RESERVADO': return 'border-l-primary'
    case 'ENTREGADO': return 'border-l-emerald-500'
    case 'DEVUELTO':  return 'border-l-slate-400'
    case 'RECHAZADO': return 'border-l-destructive'
    default:          return 'border-l-border'
  }
}

/** Fondo + borde del banner de estado en el detalle de un pedido de stock. */
export function requestStatusBannerClass(status: RequestStatus): string {
  switch (status) {
    case 'PENDIENTE': return 'border-amber-200 bg-amber-50/50'
    case 'RESERVADO': return 'border-primary/20 bg-primary/5'
    case 'ENTREGADO': return 'border-emerald-200 bg-emerald-50/50'
    case 'DEVUELTO':  return 'border-slate-200 bg-slate-50/30'
    case 'RECHAZADO': return 'border-destructive/20 bg-destructive/5'
    default:          return 'border-border bg-muted/5'
  }
}

/** Opciones para el filtro de estado de pedidos de stock (incluye "todos"). */
export const REQUEST_STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'Todos los estados' },
  { value: 'PENDIENTE', label: 'Pendiente' },
  { value: 'RESERVADO', label: 'Reservado' },
  { value: 'ENTREGADO', label: 'Entregado' },
  { value: 'DEVUELTO', label: 'Devuelto' },
  { value: 'RECHAZADO', label: 'Rechazado' },
]
