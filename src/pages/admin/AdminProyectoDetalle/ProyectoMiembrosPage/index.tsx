import { useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'

import { listProjectMembers } from '@/features/projects/api/projectsApi'
import { fetchAllUsersForAdmin } from '@/features/projects/lib/projectAdminQueries'
import type { UserDTO } from '@/lib/api/types'
import { useAuth } from '@/hooks/useAuth'

import { AgregarMiembroCard } from './AgregarMiembroCard'
import { MiembrosListCard } from './MiembrosListCard'

export default function ProyectoMiembrosPage() {
  const { id: projectId } = useParams<{ id: string }>()
  const { token, isRestoring } = useAuth()

  const membersQ = useQuery({
    queryKey: ['project-members', projectId, token],
    enabled: Boolean(token && projectId) && !isRestoring,
    queryFn: () => listProjectMembers(token!, projectId!),
  })

  const usersQ = useQuery({
    queryKey: ['admin-users-all', token],
    enabled: Boolean(token) && !isRestoring,
    queryFn: () => fetchAllUsersForAdmin(token!),
  })

  const userById = useMemo(() => {
    const m = new Map<string, UserDTO>()
    for (const u of usersQ.data ?? []) m.set(u.id, u)
    return m
  }, [usersQ.data])

  if (!projectId || !token) return null

  return (
    <div className="space-y-4 sm:space-y-6">
      <AgregarMiembroCard
        token={token}
        projectId={projectId}
        users={usersQ.data ?? []}
        usersLoading={usersQ.isLoading}
      />
      <MiembrosListCard
        token={token}
        projectId={projectId}
        members={membersQ.data?.data ?? []}
        userById={userById}
        isLoading={membersQ.isLoading}
      />
    </div>
  )
}
