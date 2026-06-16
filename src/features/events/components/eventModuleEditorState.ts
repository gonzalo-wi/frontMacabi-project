import type { EventOptionDTO, EventOptionGroupDTO, ModuleDetailDTO } from '@/features/events/model/types'

export const MODULE_TYPES = ['attendance', 'meal', 'transport', 'custom'] as const
export const GROUP_TYPES = ['single_choice', 'multiple_choice', 'text', 'number'] as const

export type GroupState = { name: string; type: string; required: boolean }
export type OptionState = { label: string; cap: string }

export function isGroupDirty(gs: GroupState, g: EventOptionGroupDTO) {
  return gs.name !== g.name || gs.type !== g.type || gs.required !== g.is_required
}

export function isOptionDirty(os: OptionState, o: EventOptionDTO) {
  const capNum = os.cap === '' ? null : Number(os.cap)
  return os.label !== o.label || capNum !== o.max_capacity
}

export function initialGroupStates(md: ModuleDetailDTO) {
  const map = new Map<string, GroupState>()
  for (const gd of md.option_groups) {
    map.set(gd.group.id, {
      name: gd.group.name,
      type: gd.group.type,
      required: gd.group.is_required,
    })
  }
  return map
}

export function initialOptionStates(md: ModuleDetailDTO) {
  const map = new Map<string, OptionState>()
  for (const gd of md.option_groups) {
    for (const o of gd.options) {
      map.set(o.id, {
        label: o.label,
        cap: o.max_capacity != null ? String(o.max_capacity) : '',
      })
    }
  }
  return map
}
