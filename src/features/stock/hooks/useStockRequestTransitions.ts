import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import {
  approveRequest,
  deliverRequest,
  rejectRequest,
  returnRequest,
} from '@/features/stock/api/requestsApi'
import { queryKeys } from '@/lib/queryKeys'

type UseStockRequestTransitionsArgs = {
  token: string | null
  requestId: string | undefined
  projectId: string | undefined
}

function useTransitionMutation(
  token: string | null,
  requestId: string | undefined,
  projectId: string | undefined,
  fn: (token: string, rid: string) => Promise<void>,
  successText: string,
) {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: () => {
      if (!token || !requestId) throw new Error('Sesión o pedido inválido')
      return fn(token, requestId)
    },
    onSuccess: async () => {
      toast.success(successText)
      await qc.invalidateQueries({ queryKey: [...queryKeys.stock.requestDetailRoot(), requestId] })
      await qc.invalidateQueries({ queryKey: [...queryKeys.stock.projectRequestsRoot(), projectId] })
      await qc.invalidateQueries({ queryKey: queryKeys.stock.adminResourcesRoot() })
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Error'),
  })
}

export function useStockRequestTransitions({
  token,
  requestId,
  projectId,
}: UseStockRequestTransitionsArgs) {
  const approveM = useTransitionMutation(
    token,
    requestId,
    projectId,
    approveRequest,
    'Pedido aprobado y material reservado.',
  )
  const rejectM = useTransitionMutation(
    token,
    requestId,
    projectId,
    rejectRequest,
    'Pedido rechazado.',
  )
  const deliverM = useTransitionMutation(
    token,
    requestId,
    projectId,
    deliverRequest,
    'Pedido marcado como entregado.',
  )
  const returnM = useTransitionMutation(
    token,
    requestId,
    projectId,
    returnRequest,
    'Ítem marcado como devuelto.',
  )

  const anyPending =
    approveM.isPending || rejectM.isPending || deliverM.isPending || returnM.isPending

  return { approveM, rejectM, deliverM, returnM, anyPending }
}
