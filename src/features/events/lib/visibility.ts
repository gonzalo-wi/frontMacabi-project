import type { EventDetailDTO, ModuleDetailDTO } from '@/features/events/model/types'

/** User can see the event instance if they belong to at least one linked project. */
export function userParticipatesInEvent(myProjectIds: Set<string>, detail: EventDetailDTO): boolean {
  return detail.project_ids.some((pid) => myProjectIds.has(pid))
}

/**
 * Module visible if: no project restriction, or overlap with user's projects that are also on the event.
 */
export function isModuleVisibleForUser(
  md: ModuleDetailDTO,
  myProjectIds: Set<string>,
  eventProjectIds: string[],
): boolean {
  if (!eventProjectIds.some((pid) => myProjectIds.has(pid))) {
    return false
  }
  if (md.project_ids.length === 0) {
    return true
  }
  return md.project_ids.some((pid) => myProjectIds.has(pid))
}

export function visibleModulesForUser(
  detail: EventDetailDTO,
  myProjectIds: Set<string>,
): ModuleDetailDTO[] {
  return detail.modules.filter((m) =>
    isModuleVisibleForUser(m, myProjectIds, detail.project_ids),
  )
}

/** Pick default `project_id` for POST body: first shared project between user and event. */
export function defaultProjectIdForResponse(
  detail: EventDetailDTO,
  myProjectIds: Set<string>,
): string | null {
  const shared = detail.project_ids.filter((pid) => myProjectIds.has(pid))
  return shared[0] ?? null
}
