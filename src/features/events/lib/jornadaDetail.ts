import type { AttendanceGate } from '@/features/events/lib/attendanceGate'
import { attendanceStatusFromAnswers } from '@/features/events/lib/attendanceGate'
import type {
  EventDetailDTO,
  EventParticipantAnswerDTO,
  EventParticipantResponseDTO,
} from '@/features/events/model/types'

// ── Tipos ──────────────────────────────────────────────────────

export type AnswerMaps = {
  optLabels: Map<string, { group: string; label: string }>
  groupNames: Map<string, string>
  groupToModule: Map<string, { title: string; sort: number }>
}

export type AnswerLine = { groupName: string; value: string }
export type ModuleAnswers = { title: string; sort: number; lines: AnswerLine[] }

export type MembershipRow = { projectId: string; projectName: string; role: string }
export type ProjectPlacement = { projectId: string; projectName: string; userId: string; role: string }

export type UnifiedParticipantRow = {
  userId: string
  displayName: string
  email: string
  memberships: MembershipRow[]
  responded: boolean
  responseRow: EventParticipantResponseDTO | null
}

// ── Transforms ─────────────────────────────────────────────────

export function buildAnswerMaps(detail: EventDetailDTO): AnswerMaps {
  const optLabels = new Map<string, { group: string; label: string }>()
  const groupNames = new Map<string, string>()
  const groupToModule = new Map<string, { title: string; sort: number }>()
  for (const md of detail.modules) {
    for (const gd of md.option_groups) {
      groupNames.set(gd.group.id, gd.group.name)
      groupToModule.set(gd.group.id, { title: md.module.title, sort: md.module.sort_order })
      for (const o of gd.options) {
        optLabels.set(o.id, { group: gd.group.name, label: o.label })
      }
    }
  }
  return { optLabels, groupNames, groupToModule }
}

export function groupAnswersByModule(
  answers: EventParticipantAnswerDTO[],
  maps: AnswerMaps,
): ModuleAnswers[] {
  const byModule = new Map<string, ModuleAnswers>()
  for (const a of answers) {
    let groupName = ''
    let value = ''
    if (a.option_id?.trim()) {
      const meta = maps.optLabels.get(a.option_id)
      if (meta) {
        groupName = meta.group
        value = meta.label
      } else {
        groupName = 'Opción'
        value = a.option_id.slice(0, 8) + '…'
      }
    } else {
      const tv = a.text_value != null ? String(a.text_value).trim() : ''
      if (!tv) continue
      groupName = (a.group_id && maps.groupNames.get(a.group_id)) ?? 'Respuesta libre'
      value = tv
    }
    const mod = (a.group_id && maps.groupToModule.get(a.group_id)) || { title: 'Otros', sort: 999 }
    const key = mod.title
    if (!byModule.has(key)) byModule.set(key, { title: mod.title, sort: mod.sort, lines: [] })
    byModule.get(key)!.lines.push({ groupName, value })
  }
  return [...byModule.values()].sort((a, b) => a.sort - b.sort)
}

export function attendanceCounts(
  gate: AttendanceGate | null,
  userIds: string[],
  rowByUserId: Map<string, UnifiedParticipantRow>,
) {
  let attend = 0
  let decline = 0
  let pending = 0
  if (!gate) return { attend, decline, pending }
  for (const uid of userIds) {
    const row = rowByUserId.get(uid)
    const st =
      row?.responded && row.responseRow
        ? attendanceStatusFromAnswers(gate, row.responseRow.answers)
        : 'pending'
    if (st === 'attends') attend++
    else if (st === 'declines') decline++
    else pending++
  }
  return { attend, decline, pending }
}

export function attendanceBadgeClass(s: string) {
  switch (s) {
    case 'attends':
      return 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
    case 'declines':
      return 'border-muted-foreground/30 bg-muted text-muted-foreground'
    case 'pending':
    default:
      return 'border-amber-300 bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
  }
}

