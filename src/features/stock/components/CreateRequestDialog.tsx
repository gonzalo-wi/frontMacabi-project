import { useMemo, useState } from 'react'
import { Package } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { FormField } from '@/components/FormField'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { fromDatetimeLocalValue } from '@/features/events/lib/datetimeLocal'
import { createRequest } from '@/features/stock/api/requestsApi'
import {
  CreateRequestForm,
  type RequestFormState,
} from '@/features/stock/components/CreateRequestForm'
import type { ResourceDTO } from '@/features/stock/model/types'
import { queryKeys } from '@/lib/queryKeys'

const EMPTY_FORM: RequestFormState = {
  resource_id: '',
  quantity: '1',
  withdrawal_date: '',
  return_date: '',
  notes: '',
}

type ProjectOption = { id: string; name: string }

type CreateRequestDialogProps = {
  token: string
  open: boolean
  onOpenChange: (open: boolean) => void
  resources: ResourceDTO[]
  /** Proyecto fijo (sin selector). */
  projectId?: string
  /** Opciones cuando el usuario elige proyecto. */
  projectOptions?: ProjectOption[]
  onSuccess?: () => void | Promise<void>
  title?: string
  contentClassName?: string
}

export function CreateRequestDialog({
  token,
  open,
  onOpenChange,
  resources,
  projectId,
  projectOptions = [],
  onSuccess,
  title = 'Solicitar material',
  contentClassName,
}: CreateRequestDialogProps) {
  const qc = useQueryClient()
  const [selectedProjectId, setSelectedProjectId] = useState('')
  const [form, setForm] = useState<RequestFormState>(EMPTY_FORM)

  const needsProjectPicker = !projectId

  const resourcesMap = useMemo(() => {
    const m = new Map<string, ResourceDTO>()
    for (const r of resources) m.set(r.id, r)
    return m
  }, [resources])

  const selectedResource = resourcesMap.get(form.resource_id) ?? null
  const resolvedProjectId = projectId ?? selectedProjectId

  const createM = useMutation({
    mutationFn: async () => {
      if (!resolvedProjectId) throw new Error('Elegí un proyecto')
      if (!form.resource_id) throw new Error('Elegí un ítem de inventario')
      const qty = Number(form.quantity)
      if (!qty || qty < 1) throw new Error('La cantidad debe ser mayor a 0')
      if (!form.withdrawal_date) throw new Error('Ingresá la fecha de retiro')
      if (selectedResource?.type === 'returnable' && !form.return_date) {
        throw new Error('La fecha de devolución es obligatoria para recursos retornables')
      }

      await createRequest(token, {
        project_id: resolvedProjectId,
        resource_id: form.resource_id,
        quantity: qty,
        withdrawal_date: fromDatetimeLocalValue(form.withdrawal_date),
        return_date: form.return_date ? fromDatetimeLocalValue(form.return_date) : null,
        notes: form.notes.trim() || undefined,
      })
    },
    onSuccess: async () => {
      toast.success('Pedido de materiales creado correctamente.')
      onOpenChange(false)
      setForm(EMPTY_FORM)
      setSelectedProjectId('')
      await qc.invalidateQueries({ queryKey: queryKeys.stock.myRequestsGlobalRoot() })
      await qc.invalidateQueries({ queryKey: [...queryKeys.stock.projectRequestsRoot(), resolvedProjectId] })
      await qc.invalidateQueries({ queryKey: queryKeys.stock.resourcesAllRoot() })
      await onSuccess?.()
    },
  })

  function handleOpenChange(next: boolean) {
    if (createM.isPending) return
    onOpenChange(next)
    if (!next) {
      setForm(EMPTY_FORM)
      setSelectedProjectId('')
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className={contentClassName ?? 'max-w-md rounded-2xl'}>
        <DialogHeader className="pb-2 border-b border-border/40">
          <DialogTitle className="text-base font-extrabold tracking-tight flex items-center gap-2.5">
            {!contentClassName && (
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                <Package className="w-4 h-4 text-primary" />
              </div>
            )}
            {title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-3">
          {needsProjectPicker && (
            <FormField label="Proyecto">
              <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                <SelectTrigger className="w-full h-11 rounded-xl bg-background/50 border-border/60 focus:ring-primary/30">
                  <SelectValue placeholder="Elegí un proyecto" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {projectOptions.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
          )}

          <CreateRequestForm
            form={form}
            onChange={setForm}
            resources={resources}
            selectedResource={selectedResource}
            onSubmit={() => createM.mutate()}
            isPending={createM.isPending}
            error={createM.error instanceof Error ? createM.error.message : undefined}
            submitDisabled={
              (needsProjectPicker && projectOptions.length === 0) || resources.length === 0
            }
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
