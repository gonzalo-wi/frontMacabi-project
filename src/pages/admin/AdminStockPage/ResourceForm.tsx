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
import type { ResourceType } from '@/features/stock/model/types'

export type FormState = {
  name: string
  type: ResourceType
  total_stock: string
}

export function ResourceForm({
  form,
  onChange,
  onSubmit,
  isPending,
  submitLabel,
  error,
}: {
  form: FormState
  onChange: (f: FormState) => void
  onSubmit: () => void
  isPending: boolean
  submitLabel: string
  error?: string
}) {
  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    onChange({ ...form, [key]: value })
  }

  return (
    <div className="space-y-4 pt-1">
      <FormField label="Nombre" htmlFor="resource-name">
        <Input
          id="resource-name"
          value={form.name}
          onChange={(e) => set('name', e.target.value)}
          className="h-11"
          placeholder="Ej: Proyector Epson"
        />
      </FormField>

      <FormField label="Tipo" htmlFor="resource-type">
        <Select value={form.type} onValueChange={(v) => set('type', v as ResourceType)}>
          <SelectTrigger id="resource-type" className="h-11">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="returnable">Retornable</SelectItem>
            <SelectItem value="consumable">Consumible</SelectItem>
          </SelectContent>
        </Select>
      </FormField>

      <FormField label="Stock total (unidades)" htmlFor="resource-stock">
        <Input
          id="resource-stock"
          type="number"
          inputMode="numeric"
          min={1}
          value={form.total_stock}
          onChange={(e) => set('total_stock', e.target.value)}
          className="h-11"
          placeholder="Ej: 5"
        />
      </FormField>

      {error && (
        <p className="text-sm text-destructive rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2">
          {error}
        </p>
      )}

      <Button disabled={isPending} onClick={onSubmit} className="w-full h-11">
        {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : submitLabel}
      </Button>
    </div>
  )
}
