import { useParams } from 'react-router-dom'

import { ProjectExpensesPanel } from '@/features/expenses/components/ProjectExpensesPanel'
import { useAuth } from '@/hooks/useAuth'

/** Vista de gastos del proyecto — usada por admins y coordinadores. */
export default function ProyectoGastosPage() {
  const { id: projectId } = useParams<{ id: string }>()
  const { token, user } = useAuth()

  if (!projectId || !token || !user) return null

  return (
    <ProjectExpensesPanel
      token={token}
      projectId={projectId}
      canEditBudget={user.role === 'admin'}
    />
  )
}
