import { useQuery } from '@tanstack/react-query'

import { fetchMyProjectMemberships } from '@/features/projects/lib/myMembership'

/**
 * Lista de proyectos del usuario actual (nombre + rol para panel / visibilidad de jornadas).
 * Key compartido con otros consumidores (p. ej. EventRespondPage) para deduplicar en red.
 */
export function useMyProjectMemberships(token: string | null | undefined, userId: string | undefined | null, isRestoring = false) {
  return useQuery({
    queryKey: ['my-project-memberships', userId, token],
    enabled: Boolean(token && userId) && !isRestoring,
    queryFn: () => fetchMyProjectMemberships(token!, userId!, 15),
    staleTime: 120_000,
  })
}
