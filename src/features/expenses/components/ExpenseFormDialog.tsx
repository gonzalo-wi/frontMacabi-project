import { useRef, useState } from 'react'
import { CreditCard, Loader2, Plus } from 'lucide-react'
import { useMutation, useQuery } from '@tanstack/react-query'

import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import {
  createExpense,
  getCategories,
  validateReceiptFile,
  RECEIPT_ACCEPT,
} from '@/features/expenses/api/expensesApi'
import { ApiError } from '@/lib/api/apiClient'
import { arsToCanonical, formatArsInput } from '@/lib/currency'

type ProjectOption = { id: string; name: string }

type Props = {
  token: string
  /** Si viene, el form está atado a este proyecto y no muestra selector. */
  projectId?: string
  /** Opciones de proyecto cuando NO hay projectId fijo (vista participante). */
  projectOptions?: ProjectOption[]
  /** Se llama tras crear el gasto (para refetch del listado correspondiente). */
  onCreated: () => void | Promise<void>
  triggerLabel?: string
  triggerClassName?: string
}

/**
 * Form único de carga de gasto, reutilizado por participante y admin/coordinador.
 * - Con `projectId`: contexto de proyecto (sin selector).
 * - Sin `projectId`: muestra selector poblado con `projectOptions`.
 * Comprobante opcional al crear para todos los roles.
 */
export function ExpenseFormDialog({
  token,
  projectId,
  projectOptions = [],
  onCreated,
  triggerLabel = 'Nuevo gasto',
  triggerClassName,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [selectedProject, setSelectedProject] = useState('')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [expenseDate, setExpenseDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [receiptFile, setReceiptFile] = useState<File | null>(null)
  const [categoryId, setCategoryId] = useState('')

  const needsProjectPicker = !projectId

  const categoriesQ = useQuery({
    queryKey: ['expense-categories', token],
    queryFn: () => getCategories(token),
    staleTime: 5 * 60_000,
  })
  const categories = categoriesQ.data ?? []

  function reset() {
    setSelectedProject('')
    setAmount('')
    setDescription('')
    setExpenseDate(new Date().toISOString().slice(0, 10))
    setReceiptFile(null)
    setCategoryId('')
    if (fileRef.current) fileRef.current.value = ''
  }

  const createM = useMutation({
    mutationFn: async () => {
      const pid = projectId ?? selectedProject
      if (!pid) throw new Error('Elegí un proyecto')
      const cleanAmount = arsToCanonical(amount)
      if (!cleanAmount) throw new Error('Ingresá un monto')
      if (!description.trim()) throw new Error('Ingresá una descripción')
      if (!expenseDate) throw new Error('Ingresá la fecha')
      if (receiptFile) {
        const receiptErr = validateReceiptFile(receiptFile)
        if (receiptErr) throw new Error(receiptErr)
      }
      await createExpense(
        token,
        {
          project_id: pid,
          amount: cleanAmount,
          description: description.trim(),
          expense_date: expenseDate,
          category_id: categoryId || undefined,
        },
        receiptFile,
      )
    },
    onSuccess: async () => {
      setOpen(false)
      reset()
      await onCreated()
    },
    onError: (e) => {
      toast.error(
        e instanceof ApiError ? e.message : e instanceof Error ? e.message : 'No se pudo cargar el gasto',
      )
    },
  })

  const triggerDisabled = needsProjectPicker && projectOptions.length === 0

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) reset()
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" className={triggerClassName} disabled={triggerDisabled}>
          <Plus className="w-4 h-4 mr-1" />
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-primary" />
            Cargar gasto
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          {needsProjectPicker && (
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Proyecto</Label>
              <Select value={selectedProject} onValueChange={setSelectedProject}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Elegí un proyecto" />
                </SelectTrigger>
                <SelectContent>
                  {projectOptions.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="exp-amount" className="text-xs font-semibold">
                Monto
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium select-none">
                  $
                </span>
                <Input
                  id="exp-amount"
                  value={amount}
                  onChange={(e) => setAmount(formatArsInput(e.target.value))}
                  placeholder="1.200,50"
                  className="pl-7"
                  inputMode="decimal"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="exp-date" className="text-xs font-semibold">
                Fecha
              </Label>
              <Input
                id="exp-date"
                type="date"
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="exp-description" className="text-xs font-semibold">
              Descripción
            </Label>
            <Textarea
              id="exp-description"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="¿En qué consistió este gasto?"
              className="resize-none"
            />
          </div>

          {categories.length > 0 && (
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Categoría</Label>
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
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="exp-receipt" className="text-xs font-semibold">
              Comprobante
            </Label>
            <Input
              id="exp-receipt"
              ref={fileRef}
              type="file"
              accept={RECEIPT_ACCEPT}
              onChange={(e) => setReceiptFile(e.target.files?.[0] ?? null)}
              className="file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 text-xs"
            />
            <p className="text-[11px] text-muted-foreground">
              Opcional. JPG, PNG, WebP o PDF hasta 2 MB.
            </p>
          </div>

          <Button disabled={createM.isPending} className="w-full" onClick={() => createM.mutate()}>
            {createM.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Guardando…
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 mr-1.5" />
                Guardar
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
