import { useQuery } from '@tanstack/react-query'

import { getEventDetail, listEventInstances } from '@/features/events/api/eventsApi'
import type { EventDetailDTO } from '@/features/events/model/types'
import type { MyProjectMembership } from '@/features/projects/lib/myMembership'
import { userParticipatesInEvent } from '@/features/events/lib/visibility'

/** Máximo de jornadas con detalle completo cargado desde el panel. */
export const USER_RELEVANT_UPCOMING_MAX = 8

export type UserRelevantUpcomingResult = {
  events: EventDetailDTO[]
  /** True si se alcanzó el máximo y puede haber más jornadas candidatas sin listar aquí */
  hasMore: boolean
}

/**
 * Lista las próximas jornadas `open`, futuras por `starts_at`, donde el usuario comparte proyecto.
 *
 * Coste acotado: como mucho USER_RELEVANT_UPCOMING_MAX detalles cargados antes de cortar el barrido.
 * Fase 2 (backend): `GET /api/me/event-instances` con filtro servidor.
 */
export async function fetchUserRelevantUpcomingEvents(
  token: string,
  myMemberships: MyProjectMembership[],
  maxEvents = USER_RELEVANT_UPCOMING_MAX,
  maxPages = 15,
): Promise<UserRelevantUpcomingResult> {
  const myIds = new Set(myMemberships.map((m) => m.id))
  const accumulated: EventDetailDTO[] = []
  let stoppedByCap = false

  pageLoop: for (let page = 1; page <= maxPages; page++) {
    const res = await listEventInstances(token, page, 30)
    const futureOpen = res.data
      .filter((e) => e.status === 'open')
      .filter((e) => new Date(e.starts_at).getTime() > Date.now())
      .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime())

    for (const inst of futureOpen) {
      const detail = await getEventDetail(token, inst.id)
      if (!userParticipatesInEvent(myIds, detail)) continue
      accumulated.push(detail)
      if (accumulated.length >= maxEvents) {
        stoppedByCap = true
        break pageLoop
      }
    }

    if (page >= res.total_pages) break
  }

  return {
    events: accumulated,
    hasMore: stoppedByCap,
  }
}

function membershipsFingerprint(rows: MyProjectMembership[]): string {
  return [...rows].map((m) => m.id).sort().join('\u0002')
}

/**
 * Combina membresías (misma fuente que `useMyProjectMemberships`) y detalle/jornadas.
 */
export function useUserRelevantUpcomingEvents(
  token: string | null | undefined,
  userId: string | undefined | null,
  memberships: MyProjectMembership[] | undefined,
  membershipsReady: boolean,
  isRestoring = false,
) {
  const fp = memberships ? membershipsFingerprint(memberships) : ''

  return useQuery({
    queryKey: ['user-relevant-upcoming-events', userId, token, fp],
    enabled: Boolean(token && userId) && membershipsReady && memberships !== undefined && !isRestoring,
    queryFn: () => fetchUserRelevantUpcomingEvents(token!, memberships!, USER_RELEVANT_UPCOMING_MAX),
    staleTime: 120_000,
  })
}
