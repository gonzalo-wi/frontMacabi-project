import { useState } from 'react'
import { Trash2 } from 'lucide-react'

import { ConfirmDialog } from '@/components/ConfirmDialog'
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
    <ConfirmDialog
      open={open}
      onOpenChange={setOpen}
      trigger={
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-9 w-9 text-destructive hover:text-destructive"
          aria-label="Eliminar gasto"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      }
      title="¿Eliminar este gasto?"
      description={
        pendingOwn
          ? 'Se borrará el gasto pendiente y su comprobante, si hay uno. Esta acción no se puede deshacer.'
          : 'Se borrará el registro del gasto y su comprobante. Esta acción no se puede deshacer.'
      }
      confirmLabel="Eliminar"
      destructive
      loading={busy}
      onConfirm={() => {
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
    />
  )
}
