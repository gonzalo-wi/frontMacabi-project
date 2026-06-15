import { useRef, useState } from 'react'
import { CreditCard, Loader2, Plus } from 'lucide-react'
import { useMutation } from '@tanstack/react-query'

import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { FormField } from '@/components/FormField'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  createExpense,
  validateReceiptFile,
  RECEIPT_ACCEPT,
} from '@/features/expenses/api/expensesApi'
import { ExpenseFormFields } from '@/features/expenses/components/ExpenseFormFields'
import { useExpenseCategories } from '@/features/expenses/hooks/useExpenseCategories'
import { ApiError } from '@/lib/api/apiClient'
import { arsToCanonical } from '@/lib/currency'

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

  const categoriesQ = useExpenseCategories(token, open)
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

  function pickReceiptFile(file: File) {
    const err = validateReceiptFile(file)
    if (err) {
      toast.error(err)
      if (fileRef.current) fileRef.current.value = ''
      return
    }
    setReceiptFile(file)
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
            <FormField label="Proyecto">
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
            </FormField>
          )}

          <ExpenseFormFields
            idPrefix="exp"
            amount={amount}
            onAmountChange={setAmount}
            expenseDate={expenseDate}
            onExpenseDateChange={setExpenseDate}
            description={description}
            onDescriptionChange={setDescription}
            categoryId={categoryId}
            onCategoryIdChange={setCategoryId}
            categories={categories}
            descriptionPlaceholder="¿En qué consistió este gasto?"
          />

          <FormField
            label="Comprobante"
            htmlFor="exp-receipt"
            hint="Opcional. JPG, PNG, WebP o PDF hasta 2 MB."
          >
            <Input
              id="exp-receipt"
              ref={fileRef}
              type="file"
              accept={RECEIPT_ACCEPT}
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) pickReceiptFile(file)
                else setReceiptFile(null)
              }}
              className="file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 text-xs"
            />
          </FormField>

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
