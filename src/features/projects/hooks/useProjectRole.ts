import { useMyProjectMemberships } from '@/features/projects/hooks/useMyProjectMemberships'
import { useAuth } from '@/hooks/useAuth'

/**
 * Permisos del usuario sobre un proyecto.
 * `canManage` = admin global o coordinador del proyecto (puede aprobar/gestionar).
 */
export function useProjectRole(projectId: string | undefined) {
  const { token, user, isRestoring } = useAuth()
  const membershipsQ = useMyProjectMemberships(token, user?.id, isRestoring)
  const member = membershipsQ.data?.find((m) => m.id === projectId)
  const isAdmin = user?.role === 'admin'
  const isCoordinator = member?.role === 'coordinator'
  return { isAdmin, isCoordinator, canManage: isAdmin || isCoordinator }
}
