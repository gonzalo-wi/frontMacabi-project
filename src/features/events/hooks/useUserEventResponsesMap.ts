import { useQueries } from '@tanstack/react-query'

import { getMyEventResponse } from '@/features/events/api/eventsApi'
import { queryKeys } from '@/lib/queryKeys'

/**
 * Carga paralela GET .../responses/me para varias jornadas (panel, chips estado).
 *
 * @returns Map por id de evento: null = aún cargando o sin query, objeto con responded.
 */
export function useUserEventResponsesMap(
  token: string | null | undefined,
  eventIds: string[],
  enabled: boolean,
) {
  const queries = useQueries({
    queries: eventIds.map((eventId) => ({
      queryKey: queryKeys.events.myResponse(eventId, token),
      queryFn: () => getMyEventResponse(token!, eventId),
      enabled: Boolean(token && enabled && eventId && eventIds.length > 0),
      staleTime: 90_000,
    })),
  })

  const map = new Map<string, boolean | undefined>()
  for (let i = 0; i < eventIds.length; i++) {
    const q = queries[i]
    const id = eventIds[i]
    if (q.isPending || q.isLoading) map.set(id, undefined)
    else map.set(id, !!q.data?.response)
  }
  return map
}
