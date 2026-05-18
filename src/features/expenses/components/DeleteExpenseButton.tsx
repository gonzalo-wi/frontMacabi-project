import { useState } from 'react'
import { Loader2, Trash2 } from 'lucide-react'

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
import { Button } from '@/components/ui/button'
import { deleteExpense } from '@/features/expenses/api/expensesApi'
import type { ExpenseDTO } from '@/features/expenses/model/types'
import { ApiError } from '@/lib/api/apiClient'

type Props = {
  token: string
  exp: ExpenseDTO
  viewerUserId: string
  coordinatorMode: boolean
  onDeleted: () => void | Promise<void>
  onError: (message: string) => void
}

export function canDeleteExpense(
  exp: ExpenseDTO,
  viewerUserId: string,
  coordinatorMode: boolean,
): boolean {
  const isOwner = exp.submitted_by_user_id === viewerUserId
  if (isOwner && exp.status === 'PENDIENTE') return true
  if (coordinatorMode && (exp.status === 'APROBADO' || exp.status === 'RECHAZADO')) return true
  return false
}

export function DeleteExpenseButton({
  token,
  exp,
  viewerUserId,
  coordinatorMode,
  onDeleted,
  onError,
}: Props) {
  const [busy, setBusy] = useState(false)
  const [open, setOpen] = useState(false)

  if (!canDeleteExpense(exp, viewerUserId, coordinatorMode)) {
    return null
  }

  const pendingOwn = exp.status === 'PENDIENTE' && exp.submitted_by_user_id === viewerUserId

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-8 w-8 text-destructive hover:text-destructive"
          aria-label="Eliminar gasto"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Eliminar este gasto?</AlertDialogTitle>
          <AlertDialogDescription>
            {pendingOwn
              ? 'Se borrará el gasto pendiente y su comprobante, si hay uno. Esta acción no se puede deshacer.'
              : 'Se borrará el registro del gasto y su comprobante. Esta acción no se puede deshacer.'}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            disabled={busy}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={(e) => {
              e.preventDefault()
              void (async () => {
                setBusy(true)
                try {
                  await deleteExpense(token, exp.id)
                  setOpen(false)
                  await onDeleted()
                } catch (err) {
                  onError(err instanceof ApiError ? err.message : 'No se pudo eliminar el gasto')
                } finally {
                  setBusy(false)
                }
              })()
            }}
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Eliminar'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
