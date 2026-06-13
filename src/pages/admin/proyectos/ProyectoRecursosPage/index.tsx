import { useParams } from 'react-router-dom'

import { ProjectStockPanel } from '@/features/stock/components/ProjectStockPanel'
import { useAuth } from '@/hooks/useAuth'
import { useProjectRole } from '@/hooks/useProjectRole'

/**
 * Vista de recursos de un proyecto (admin/coordinador). Reusa el mismo panel
 * que ve el coordinador en /app/stock → ambos roles ven exactamente lo mismo.
 */
export default function ProyectoRecursosPage() {
  const { id: projectId } = useParams<{ id: string }>()
  const { token } = useAuth()
  const { canManage } = useProjectRole(projectId)

  if (!projectId || !token) return null

  return <ProjectStockPanel token={token} projectId={projectId} canManage={canManage} />
}
