import { useMyProjectMemberships } from '@/features/projects/hooks/useMyProjectMemberships'
import { useSearchParamState } from '@/hooks/useSearchParamState'

/**
 * Estado compartido de las páginas "Mis X" (gastos / materiales): alterna entre
 * "Mis X" y "Del proyecto" (solo si el usuario coordina algún proyecto) y recuerda
 * el proyecto elegido. Reusa useMyProjectMemberships (key deduplicado en red).
 */
export function useProjectScope(
  token: string | null | undefined,
  userId: string | undefined | null,
  isRestoring = false,
) {
  const membershipsQ = useMyProjectMemberships(token, userId, isRestoring)
  const projectOptions = membershipsQ.data ?? []
  const coordinated = projectOptions.filter((p) => p.role === 'coordinator')
  const hasCoordinated = coordinated.length > 0

  const [tab, setTab] = useSearchParamState('tab', 'mis')
  const [proj, setProj] = useSearchParamState('proj', '')

  const activeTab = hasCoordinated ? tab : 'mis'
  const selectedProjectId = proj || coordinated[0]?.id || ''

  return {
    membershipsQ,
    projectOptions,
    coordinated,
    hasCoordinated,
    activeTab,
    setTab,
    selectedProjectId,
    setProj,
  }
}
