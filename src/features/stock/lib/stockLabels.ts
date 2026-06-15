import type { ResourceType } from '@/features/stock/model/types'

/** Etiquetas legibles del tipo de recurso de stock. */
export const RESOURCE_TYPE_LABELS: Record<ResourceType, string> = {
  returnable: 'Retornable',
  consumable: 'Consumible',
}
