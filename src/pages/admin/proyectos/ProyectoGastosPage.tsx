import { useParams } from 'react-router-dom'

import { ProjectExpensesPanel } from '@/features/expenses/components/ProjectExpensesPanel'
import { useAuth } from '@/hooks/useAuth'

/** Vista administrativa de gastos del proyecto; reutiliza el panel operativo con permisos de coordinador/admin. */
export default function ProyectoGastosPage() {
  const { id: projectId } = useParams<{ id: string }>()
  const { token, user } = useAuth()

  if (!projectId || !token || !user) return null

  return (
    <ProjectExpensesPanel
      token={token}
      viewerUserId={user.id}
      projectId={projectId}
      coordinatorMode
    />
  )
}
