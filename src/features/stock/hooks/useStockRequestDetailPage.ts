import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'

import { getRequest } from '@/features/stock/api/requestsApi'
import type { RequestStatus } from '@/features/stock/model/types'
import { useStockRequestTransitions } from '@/features/stock/hooks/useStockRequestTransitions'
import { useProjectRole } from '@/features/projects/hooks/useProjectRole'
import { queryKeys } from '@/lib/queryKeys'

type WorkflowStep = { key: RequestStatus; label: string }

const RETURNABLE_STEPS: WorkflowStep[] = [
  { key: 'PENDIENTE', label: 'Pendiente' },
  { key: 'RESERVADO', label: 'Reservado' },
  { key: 'ENTREGADO', label: 'Entregado' },
  { key: 'DEVUELTO', label: 'Devuelto' },
]

const CONSUMABLE_STEPS: WorkflowStep[] = [
  { key: 'PENDIENTE', label: 'Pendiente' },
  { key: 'RESERVADO', label: 'Reservado' },
  { key: 'ENTREGADO', label: 'Entregado' },
]

type UseStockRequestDetailPageArgs = {
  id: string | undefined
  token: string | null
  isRestoring: boolean
  pathname: string
}

export function useStockRequestDetailPage({ id, token, isRestoring, pathname }: UseStockRequestDetailPageArgs) {
  const requestQ = useQuery({
    queryKey: queryKeys.stock.requestDetail(id, token),
    enabled: Boolean(token && id) && !isRestoring,
    queryFn: () => getRequest(token!, id!),
  })

  const req = requestQ.data

  const { approveM, rejectM, deliverM, returnM, anyPending } = useStockRequestTransitions({
    token,
    requestId: id,
    projectId: req?.project_id,
  })

  const participantView = !pathname.startsWith('/app/admin/')
  const { canManage: canManageRequest } = useProjectRole(req?.project_id)

  const steps = req?.resource_type === 'returnable' ? RETURNABLE_STEPS : CONSUMABLE_STEPS

  const { currentStepIdx, isTerminal } = useMemo(() => {
    if (!req) return { currentStepIdx: -1, isTerminal: false }
    const idx = steps.findIndex((s) => s.key === req.status)
    const terminal =
      req.status === 'RECHAZADO' ||
      req.status === 'DEVUELTO' ||
      (req.status === 'ENTREGADO' && req.resource_type === 'consumable')
    return { currentStepIdx: idx, isTerminal: terminal }
  }, [req, steps])

  return {
    requestQ,
    req,
    approveM,
    rejectM,
    deliverM,
    returnM,
    anyPending,
    participantView,
    canManageRequest,
    steps,
    currentStepIdx,
    isTerminal,
  }
}
