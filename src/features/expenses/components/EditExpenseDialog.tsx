import { useState, useEffect } from 'react'
import { Loader2, Pencil } from 'lucide-react'
import { useMutation } from '@tanstack/react-query'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { patchExpense } from '@/features/expenses/api/expensesApi'
import type { ExpenseDTO } from '@/features/expenses/model/types'
import { ApiError } from '@/lib/api/apiClient'

type Props = {
  token: string
  exp: ExpenseDTO
  viewerUserId: string
  coordinatorMode: boolean
  onEdited: () => void | Promise<void>
  onError: (message: string) => void
}

export function canEditExpense(
  exp: ExpenseDTO,
  viewerUserId: string,
  coordinatorMode: boolean,
): boolean {
  const isOwner = exp.submitted_by_user_id === viewerUserId
  if (isOwner && exp.status === 'PENDIENTE') return true
  if (coordinatorMode) return true
  return false
}

export function EditExpenseDialog({
  token,
  exp,
  viewerUserId,
  coordinatorMode,
  onEdited,
  onError,
}: Props) {
  const [open, setOpen] = useState(false)
  const [amount, setAmount] = useState(exp.amount)
  const [description, setDescription] = useState(exp.description)
  const [expenseDate, setExpenseDate] = useState(() => exp.expense_date.slice(0, 10))

  useEffect(() => {
    if (open) {
      setAmount(exp.amount)
      setDescription(exp.description)
      setExpenseDate(exp.expense_date.slice(0, 10))
    }
  }, [open, exp])

  const editM = useMutation({
    mutationFn: async () => {
      const cleanAmount = amount.trim().replace(',', '.')
      await patchExpense(token, exp.id, {
        amount: cleanAmount,
        description: description.trim(),
        expense_date: expenseDate,
      })
    },
    onSuccess: async () => {
      setOpen(false)
      await onEdited()
    },
    onError: (e) => {
      onError(e instanceof ApiError ? e.message : 'No se pudo editar el gasto')
    },
  })

  if (!canEditExpense(exp, viewerUserId, coordinatorMode)) {
    return null
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          aria-label="Editar gasto"
        >
          <Pencil className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Editar gasto</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Monto</Label>
              <Input value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Fecha</Label>
              <Input type="date" value={expenseDate} onChange={(e) => setExpenseDate(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Descripción</Label>
            <Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <Button
            disabled={editM.isPending}
            className="w-full"
            onClick={() => editM.mutate()}
          >
            {editM.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Guardar cambios'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
