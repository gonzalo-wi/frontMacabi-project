import type { EventParticipantAnswerDTO } from '@/features/events/model/types'
import type { ModuleDetailDTO } from '@/features/events/model/types'

export type AttendanceGate = {
  moduleId: string
  moduleTitle: string
  groupId: string
  groupName: string
  optionIdsSorted: Map<string, { label: string; sort: number }>
}

/** Heuristic: primera opción cuyo label indica no asiste (marcá tus opciones con "No asisto", "No", etc.). */
export function optionLabelIndicatesDecline(label: string): boolean {
  const t = label.trim().toLowerCase().normalize('NFD').replace(/\p{M}/gu, '')
  if (t.startsWith('no ') || t === 'no' || t.startsWith('no,')) return true
  if (/\bno asist|\bno voy|\bno puedo|\bcancel\b|\bdevol\b|\bdeclin\b/.test(t)) return true
  return false
}

function sortedModules(ms: ModuleDetailDTO[]): ModuleDetailDTO[] {
  return [...ms].sort((a, b) => a.module.sort_order - b.module.sort_order)
}

/**
 * Primera pregunta de asistencia: primer módulo tipo `attendance`, primer grupo single_choice.
 */
export function findAttendanceGate(modules: ModuleDetailDTO[]): AttendanceGate | null {
  const attendanceMods = sortedModules(modules).filter((m) => m.module.type === 'attendance')
  for (const md of attendanceMods) {
    const groups = [...md.option_groups].sort((a, b) => a.group.sort_order - b.group.sort_order)
    for (const gd of groups) {
      if (gd.group.type !== 'single_choice') continue
      const opts = [...gd.options].sort((a, b) => a.sort_order - b.sort_order)
      if (opts.length === 0) continue
      const map = new Map<string, { label: string; sort: number }>()
      for (const o of opts) map.set(o.id, { label: o.label, sort: o.sort_order })
      return {
        moduleId: md.module.id,
        moduleTitle: md.module.title,
        groupId: gd.group.id,
        groupName: gd.group.name,
        optionIdsSorted: map,
      }
    }
  }
  return null
}

export type AttendanceStatus = 'pending' | 'attends' | 'declines' | 'answered_no_gate'

export function attendanceStatusLabel(s: AttendanceStatus): string {
  switch (s) {
    case 'pending':
      return 'Pendiente'
    case 'attends':
      return 'Asiste'
    case 'declines':
      return 'No asiste'
    case 'answered_no_gate':
      return 'Sin dato'
  }
}

/** Interpreta estado de asistencia a partir de las respuestas guardadas + definición del formulario. */
export function attendanceStatusFromAnswers(
  gate: AttendanceGate | null,
  answers: EventParticipantAnswerDTO[],
): AttendanceStatus {
  if (!gate) return 'answered_no_gate'
  const optId = answers.find((a) => a.group_id === gate.groupId && a.option_id?.trim())?.option_id
  if (!optId?.trim()) return 'pending'
  const meta = gate.optionIdsSorted.get(optId)
  if (!meta) return 'pending'
  return optionLabelIndicatesDecline(meta.label) ? 'declines' : 'attends'
}
