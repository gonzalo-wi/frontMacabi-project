import {
  getEventDetail,
  listEventInstances,
} from '@/features/events/api/eventsApi'
import type { EventDetailDTO } from '@/features/events/model/types'
import { getUsers } from '@/lib/api/admin'
import type { UserDTO } from '@/lib/api/types'

/**
 * Carga jornadas cuyo detalle incluye este `projectId`. Costo alto; ideal filtrar en API.
 */
export async function loadEventDetailsForProject(
  token: string,
  projectId: string,
): Promise<EventDetailDTO[]> {
  const out: EventDetailDTO[] = []
  let page = 1
  while (page <= 25) {
    const r = await listEventInstances(token, page, 40)
    const details = await Promise.all(r.data.map((i) => getEventDetail(token, i.id)))
    for (const d of details) {
      if (d.project_ids.includes(projectId)) {
        out.push(d)
      }
    }
    if (page >= r.total_pages) break
    page++
  }
  return out
}

export async function fetchAllUsersForAdmin(token: string): Promise<UserDTO[]> {
  const out: UserDTO[] = []
  let page = 1
  while (page <= 30) {
    const r = await getUsers(token, page, 100)
    out.push(...r.data)
    if (page >= r.total_pages) break
    page++
  }
  return out
}
