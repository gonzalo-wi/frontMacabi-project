import { Loader2 } from 'lucide-react'

import { FormField } from '@/components/FormField'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { RESOURCE_TYPE_LABELS } from '@/features/stock/lib/stockLabels'
import type { ResourceDTO } from '@/features/stock/model/types'

export type RequestFormState = {
  resource_id: string
  quantity: string
  withdrawal_date: string
  return_date: string
  notes: string
}

type CreateRequestFormProps = {
  form: RequestFormState
  onChange: (f: RequestFormState) => void
  resources: ResourceDTO[]
  selectedResource: ResourceDTO | null
  onSubmit: () => void
  isPending: boolean
  error?: string
}

/** Formulario de creación de pedido (proyecto ya conocido por el contexto). */
export function CreateRequestForm({
  form,
  onChange,
  resources,
  selectedResource,
  onSubmit,
  isPending,
  error,
}: CreateRequestFormProps) {
  function set<K extends keyof RequestFormState>(key: K, value: RequestFormState[K]) {
    onChange({ ...form, [key]: value })
  }

  const needsReturn = selectedResource?.type === 'returnable'

  return (
    <div className="space-y-4 pt-1">
      <FormField label="Ítem de inventario" htmlFor="req-resource">
        <Select value={form.resource_id} onValueChange={(v) => set('resource_id', v)}>
          <SelectTrigger id="req-resource" className="h-11">
            <SelectValue placeholder="Seleccioná un ítem…" />
          </SelectTrigger>
          <SelectContent>
            {resources.map((r) => (
              <SelectItem key={r.id} value={r.id}>
                <span className="font-medium">{r.name}</span>
                <span className="ml-2 text-muted-foreground text-xs">
                  ({RESOURCE_TYPE_LABELS[r.type]} · {r.available_stock} disp.)
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormField>

      <FormField label="Cantidad" htmlFor="req-quantity">
        <Input
          id="req-quantity"
          type="number"
          inputMode="numeric"
          min={1}
          value={form.quantity}
          onChange={(e) => set('quantity', e.target.value)}
          className="h-11"
          placeholder="1"
        />
      </FormField>

      <FormField label="Fecha de retiro" htmlFor="req-withdrawal">
        <Input
          id="req-withdrawal"
          type="datetime-local"
          value={form.withdrawal_date}
          onChange={(e) => set('withdrawal_date', e.target.value)}
          className="h-11"
        />
      </FormField>

      {needsReturn && (
        <FormField label="Fecha de devolución" htmlFor="req-return" required>
          <Input
            id="req-return"
            type="datetime-local"
            value={form.return_date}
            onChange={(e) => set('return_date', e.target.value)}
            className="h-11"
            disabled={!form.withdrawal_date}
            min={form.withdrawal_date}
          />
        </FormField>
      )}

      <FormField
        htmlFor="req-notes"
        label={
          <>
            Notas{' '}
            <span className="normal-case font-normal text-muted-foreground/60">(opcional)</span>
          </>
        }
      >
        <Textarea
          id="req-notes"
          value={form.notes}
          onChange={(e) => set('notes', e.target.value)}
          rows={2}
          placeholder="Ej: Para el evento del sábado"
        />
      </FormField>

      {error && (
        <p className="text-sm text-destructive rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2">
          {error}
        </p>
      )}

      <Button disabled={isPending} onClick={onSubmit} className="w-full h-11">
        {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Crear pedido'}
      </Button>
    </div>
  )
}
