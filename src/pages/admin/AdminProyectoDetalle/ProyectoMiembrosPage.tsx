import { useParams } from 'react-router-dom'

import { AgregarMiembroCard } from '@/features/projects/components/AgregarMiembroCard'
import { MiembrosListCard } from '@/features/projects/components/MiembrosListCard'
import { useProyectoMiembrosPage } from '@/features/projects/hooks/useProyectoMiembrosPage'
import { useAuth } from '@/hooks/useAuth'

export default function ProyectoMiembrosPage() {
  const { id: projectId } = useParams<{ id: string }>()
  const { token, isRestoring } = useAuth()

  const { membersQ, usersQ, userById } = useProyectoMiembrosPage({
    token,
    projectId,
    isRestoring,
  })

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
