import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'

import { listProjectMembers } from '@/features/projects/api/projectsApi'
import { useAdminUsers } from '@/features/users/hooks/useAdminUsers'
import type { UserDTO } from '@/lib/api/types'
import { queryKeys } from '@/lib/queryKeys'

type Args = {
  token: string | null
  projectId: string | undefined
  isRestoring: boolean
}

export function useProyectoMiembrosPage({ token, projectId, isRestoring }: Args) {
  const membersQ = useQuery({
    queryKey: queryKeys.projects.members(projectId, token),
    enabled: Boolean(token && projectId) && !isRestoring,
    queryFn: () => listProjectMembers(token!, projectId!),
  })

  const usersQ = useAdminUsers(token, isRestoring)

  const userById = useMemo(() => {
    const m = new Map<string, UserDTO>()
    for (const u of usersQ.data ?? []) m.set(u.id, u)
    return m
  }, [usersQ.data])

  return {
    membersQ,
    usersQ,
    userById,
  }
}
