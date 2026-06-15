import { useQuery } from '@tanstack/react-query'

import { getProject } from '@/features/projects/api/projectsApi'
import { queryKeys } from '@/lib/queryKeys'

export function useProject(
  token: string | null | undefined,
  projectId: string | undefined,
  isRestoring = false,
) {
  return useQuery({
    queryKey: queryKeys.projects.detail(projectId, token),
    enabled: Boolean(token && projectId) && !isRestoring,
    queryFn: () => getProject(token!, projectId!),
  })
}
