import { Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
      <div className="space-y-1.5">
        <Label
          htmlFor="resource-name"
          className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
        >
          Nombre
        </Label>
        <Input
          id="resource-name"
          value={form.name}
          onChange={(e) => set('name', e.target.value)}
          className="h-11"
          placeholder="Ej: Proyector Epson"
        />
      </div>

      <div className="space-y-1.5">
        <Label
          htmlFor="resource-type"
          className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
        >
          Tipo
        </Label>
        <Select value={form.type} onValueChange={(v) => set('type', v as ResourceType)}>
          <SelectTrigger id="resource-type" className="h-11">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="returnable">Retornable</SelectItem>
            <SelectItem value="consumable">Consumible</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label
          htmlFor="resource-stock"
          className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
        >
          Stock total (unidades)
        </Label>
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
      </div>

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
