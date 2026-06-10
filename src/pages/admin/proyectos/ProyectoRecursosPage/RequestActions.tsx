import { CheckCircle2, RotateCcw, Truck, X } from 'lucide-react'

import { ActionButton } from '@/components/ActionButton'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import type { ResourceRequestDTO } from '@/features/stock/model/types'

type RequestActionsProps = {
  req: ResourceRequestDTO
  onApprove: () => void
  onReject: () => void
  onDeliver: () => void
  onReturn: () => void
  isPending: boolean
}

export function RequestActions({
  req,
  onApprove,
  onReject,
  onDeliver,
  onReturn,
  isPending,
}: RequestActionsProps) {
  if (req.status === 'PENDIENTE') {
    return (
      <>
        <ActionButton intent="approve" size="sm" disabled={isPending} onClick={onApprove}>
          <CheckCircle2 className="w-3.5 h-3.5" />
          Aprobar
        </ActionButton>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <ActionButton intent="reject" size="sm" disabled={isPending}>
              <X className="w-3.5 h-3.5" />
              Rechazar
            </ActionButton>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Rechazar pedido?</AlertDialogTitle>
              <AlertDialogDescription>
                El pedido de <strong>{req.resource_name}</strong> ({req.quantity} u.) solicitado
                por {req.requester_name} será rechazado.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground"
                onClick={onReject}
              >
                Rechazar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    )
  }

  if (req.status === 'RESERVADO') {
    return (
      <ActionButton intent="deliver" size="sm" disabled={isPending} onClick={onDeliver}>
        <Truck className="w-3.5 h-3.5" />
        Entregar
      </ActionButton>
    )
  }

  if (req.status === 'ENTREGADO' && req.resource_type === 'returnable') {
    return (
      <ActionButton intent="return" size="sm" disabled={isPending} onClick={onReturn}>
        <RotateCcw className="w-3.5 h-3.5" />
        Devolver
      </ActionButton>
    )
  }

  return null
}
