import { useQuery } from '@tanstack/react-query'

import { fetchUserProjectsByUser } from '@/features/projects/lib/userProjectsIndex'
import { queryKeys } from '@/lib/queryKeys'

/** Índice user_id → proyectos (drawer admin usuarios, badges en tabla). */
export function useUserProjectsByUser(
  token: string | null | undefined,
  isRestoring = false,
) {
  return useQuery({
    queryKey: queryKeys.users.byUserProjects(token),
    queryFn: () => fetchUserProjectsByUser(token!),
    enabled: Boolean(token) && !isRestoring,
  })
}
