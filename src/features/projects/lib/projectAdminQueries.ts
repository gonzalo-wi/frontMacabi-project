import {
  getEventDetail,
  listEventInstances,
} from '@/features/events/api/eventsApi'
import type { EventDetailDTO } from '@/features/events/model/types'

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
    const r = await listEventInstances(token, { page, pageSize: 40 })
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
