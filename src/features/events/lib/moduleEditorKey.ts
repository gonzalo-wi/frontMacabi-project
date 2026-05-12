import type { ModuleDetailDTO } from '@/features/events/model/types'

/** Resetea estado local del editor cuando el servidor devuelve cambios en el módulo (`key` en React). */
export function moduleEditorResetKey(md: ModuleDetailDTO) {
  const m = md.module
  return `${m.id}-${m.title}-${m.type}-${m.sort_order}-${m.is_required}-${[...md.project_ids].sort().join(',')}`
}
