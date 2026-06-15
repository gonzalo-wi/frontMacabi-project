import { useState, useEffect, useRef } from 'react'
import { Loader2, Paperclip, Pencil, Upload, X } from 'lucide-react'
import { useMutation, useQuery } from '@tanstack/react-query'

import { ExpenseStatusBadge } from '@/features/expenses/components/ExpenseStatusBadge'
import { FormField } from '@/components/FormField'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import {
  getCategories,
  patchExpense,
  removeReceipt,
  uploadReceipt,
  validateReceiptFile,
  RECEIPT_ACCEPT,
} from '@/features/expenses/api/expensesApi'
import { ReceiptLink } from '@/features/expenses/components/ReceiptLink'
import type { ExpenseDTO } from '@/features/expenses/model/types'
import { ApiError } from '@/lib/api/apiClient'
import { arsToCanonical, canonicalToArs, formatArsInput } from '@/lib/currency'

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
  const [amount, setAmount] = useState(() => canonicalToArs(exp.amount))
  const [description, setDescription] = useState(exp.description)
  const [expenseDate, setExpenseDate] = useState(() => exp.expense_date.slice(0, 10))
  const [categoryId, setCategoryId] = useState(() => exp.category_id ?? '')
  // Cambios de comprobante "staged": se aplican recién al Guardar.
  const [newFile, setNewFile] = useState<File | null>(null)
  const [removeExisting, setRemoveExisting] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const categoriesQ = useQuery({
    queryKey: ['expense-categories', token],
    queryFn: () => getCategories(token),
    staleTime: 5 * 60_000,
  })
  const categories = categoriesQ.data ?? []

  useEffect(() => {
    if (open) {
      setAmount(canonicalToArs(exp.amount))
      setDescription(exp.description)
      setExpenseDate(exp.expense_date.slice(0, 10))
      setCategoryId(exp.category_id ?? '')
      setNewFile(null)
      setRemoveExisting(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }, [open, exp])

  const saveM = useMutation({
    mutationFn: async () => {
      await patchExpense(token, exp.id, {
        amount: arsToCanonical(amount),
        description: description.trim(),
        expense_date: expenseDate,
        category_id: categoryId || '',
      })
      // Aplicar el cambio de comprobante recién acá.
      if (newFile) {
        await uploadReceipt(token, exp.id, newFile)
      } else if (removeExisting && exp.receipt_storage_path) {
        await removeReceipt(token, exp.id)
      }
    },
    onSuccess: async () => {
      setOpen(false)
      await onEdited()
    },
    onError: (e) => {
      onError(e instanceof ApiError ? e.message : 'No se pudo guardar el gasto')
    },
  })

  function pickFile(file: File) {
    const err = validateReceiptFile(file)
    if (err) {
      onError(err)
      return
    }
    setNewFile(file)
    setRemoveExisting(false)
  }

  if (!canEditExpense(exp, viewerUserId, coordinatorMode)) {
    return null
  }

  const showCurrent = !!exp.receipt_storage_path && !removeExisting && !newFile

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-9 w-9 text-muted-foreground hover:text-foreground"
          aria-label="Editar gasto"
        >
          <Pencil className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm sm:max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Editar gasto
            <ExpenseStatusBadge status={exp.status} className="text-[10px]" />
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Monto" htmlFor="edit-amount">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium select-none">
                  $
                </span>
                <Input
                  id="edit-amount"
                  value={amount}
                  onChange={(e) => setAmount(formatArsInput(e.target.value))}
                  placeholder="1.200,50"
                  className="pl-7"
                  inputMode="decimal"
                />
              </div>
            </FormField>
            <FormField label="Fecha" htmlFor="edit-date">
              <Input
                id="edit-date"
                type="date"
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
              />
            </FormField>
          </div>

          <FormField label="Descripción" htmlFor="edit-description">
            <Textarea
              id="edit-description"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="resize-none"
            />
          </FormField>

          {categories.length > 0 && (
            <FormField label="Categoría">
              <Select value={categoryId || 'none'} onValueChange={(v) => setCategoryId(v === 'none' ? '' : v)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Sin categoría" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin categoría</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
          )}

          {/* ── Comprobante (los cambios se aplican al guardar) ── */}
          <FormField label="Comprobante" hint="JPG, PNG, WebP o PDF hasta 2 MB. Se guarda al confirmar.">
            <input
              ref={fileRef}
              type="file"
              accept={RECEIPT_ACCEPT}
              className="hidden"
              aria-label="Seleccionar comprobante"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (fileRef.current) fileRef.current.value = ''
                if (f) pickFile(f)
              }}
            />

            {newFile ? (
              <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2">
                <Paperclip className="w-3.5 h-3.5 text-primary shrink-0" />
                <span className="flex-1 min-w-0 text-sm font-medium text-foreground truncate">
                  {newFile.name}
                </span>
                <span className="text-[10px] text-muted-foreground shrink-0">nuevo</span>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={() => setNewFile(null)}
                  aria-label="Cancelar nuevo comprobante"
                  className="h-7 w-7"
                >
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
            ) : showCurrent ? (
              <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
                <Paperclip className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <ReceiptLink
                  token={token}
                  expenseId={exp.id}
                  storagePath={exp.receipt_storage_path!}
                  onError={onError}
                  className="flex-1 min-w-0 text-sm font-medium text-primary truncate"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => fileRef.current?.click()}
                  className="h-8 px-2 text-muted-foreground hover:text-foreground"
                >
                  Cambiar
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={() => setRemoveExisting(true)}
                  aria-label="Quitar comprobante"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                >
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileRef.current?.click()}
                  className="flex-1 gap-1.5"
                >
                  <Upload className="w-3.5 h-3.5" />
                  Adjuntar comprobante
                </Button>
                {removeExisting && exp.receipt_storage_path && (
                  <button
                    type="button"
                    onClick={() => setRemoveExisting(false)}
                    className="text-xs text-primary hover:underline shrink-0"
                  >
                    Deshacer
                  </button>
                )}
              </div>
            )}
          </FormField>

          <Button disabled={saveM.isPending} className="w-full" onClick={() => saveM.mutate()}>
            {saveM.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Guardar'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
