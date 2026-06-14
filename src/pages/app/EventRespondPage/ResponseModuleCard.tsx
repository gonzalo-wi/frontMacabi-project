import type { Dispatch, SetStateAction } from 'react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import type { ModuleDetailDTO } from '@/features/events/model/types'
import { cn } from '@/lib/utils'

type Props = {
  md: ModuleDetailDTO
  canEdit: boolean
  single: Record<string, string>
  setSingle: Dispatch<SetStateAction<Record<string, string>>>
  multi: Record<string, string[]>
  setMulti: Dispatch<SetStateAction<Record<string, string[]>>>
  textVal: Record<string, string>
  setTextVal: Dispatch<SetStateAction<Record<string, string>>>
}

export function ResponseModuleCard({
  md,
  canEdit,
  single,
  setSingle,
  multi,
  setMulti,
  textVal,
  setTextVal,
}: Props) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{md.module.title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {[...md.option_groups]
          .sort((a, b) => a.group.sort_order - b.group.sort_order)
          .map((gd) => {
            const g = gd.group
            const opts = [...gd.options].sort((a, b) => a.sort_order - b.sort_order)

            if (g.type === 'single_choice') {
              return (
                <div key={g.id} className="space-y-2">
                  <Label className="text-sm font-medium">
                    {g.name}
                    {g.is_required && <span className="text-destructive"> *</span>}
                  </Label>
                  {!canEdit ? (
                    <p className="text-sm text-muted-foreground">
                      {opts.find((o) => o.id === single[g.id])?.label ?? '—'}
                    </p>
                  ) : (
                    <RadioGroup
                      value={single[g.id] ?? ''}
                      onValueChange={(v) => setSingle((s) => ({ ...s, [g.id]: v }))}
                    >
                      {opts.map((o) => {
                        const full = o.max_capacity != null && o.current_count >= o.max_capacity
                        const disabled = full && single[g.id] !== o.id
                        return (
                          <label
                            key={o.id}
                            className={cn(
                              'flex items-center gap-2 rounded-lg border px-3 py-2 text-sm',
                              disabled && 'opacity-50',
                            )}
                          >
                            <RadioGroupItem value={o.id} disabled={disabled} />
                            <span className="flex-1">{o.label}</span>
                            {o.max_capacity != null && (
                              <span className="text-xs text-muted-foreground">
                                {o.current_count}/{o.max_capacity}
                              </span>
                            )}
                          </label>
                        )
                      })}
                    </RadioGroup>
                  )}
                </div>
              )
            }

            if (g.type === 'multiple_choice') {
              const selected = new Set(multi[g.id] ?? [])
              return (
                <div key={g.id} className="space-y-2">
                  <Label className="text-sm font-medium">
                    {g.name}
                    {g.is_required && <span className="text-destructive"> *</span>}
                  </Label>
                  {!canEdit ? (
                    <p className="text-sm text-muted-foreground">
                      {(multi[g.id] ?? [])
                        .map((id) => opts.find((o) => o.id === id)?.label)
                        .filter(Boolean)
                        .join(', ') || '—'}
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {opts.map((o) => {
                        const full =
                          o.max_capacity != null &&
                          o.current_count >= o.max_capacity &&
                          !selected.has(o.id)
                        const checked = selected.has(o.id)
                        return (
                          <label
                            key={o.id}
                            className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm"
                          >
                            <input
                              type="checkbox"
                              className="rounded border-input"
                              checked={checked}
                              disabled={full}
                              onChange={() => {
                                setMulti((m) => {
                                  const cur = new Set(m[g.id] ?? [])
                                  if (cur.has(o.id)) cur.delete(o.id)
                                  else cur.add(o.id)
                                  return { ...m, [g.id]: [...cur] }
                                })
                              }}
                            />
                            <span className="flex-1">{o.label}</span>
                            {o.max_capacity != null && (
                              <span className="text-xs text-muted-foreground">
                                {o.current_count}/{o.max_capacity}
                              </span>
                            )}
                          </label>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            }

            if (g.type === 'text' || g.type === 'number') {
              return (
                <div key={g.id} className="space-y-2">
                  <Label htmlFor={g.id} className="text-sm font-medium">
                    {g.name}
                    {g.is_required && <span className="text-destructive"> *</span>}
                  </Label>
                  {!canEdit ? (
                    <p className="text-sm text-muted-foreground">{textVal[g.id] ?? '—'}</p>
                  ) : (
                    <Input
                      id={g.id}
                      type={g.type === 'number' ? 'number' : 'text'}
                      value={textVal[g.id] ?? ''}
                      onChange={(e) => setTextVal((t) => ({ ...t, [g.id]: e.target.value }))}
                      className="h-11"
                    />
                  )}
                </div>
              )
            }

            return (
              <p key={g.id} className="text-sm text-muted-foreground">
                Tipo de grupo no soportado: {g.type}
              </p>
            )
          })}
      </CardContent>
    </Card>
  )
}
