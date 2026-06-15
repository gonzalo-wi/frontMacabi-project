import { BarChart3 } from 'lucide-react'

import { Input } from '@/components/ui/input'
import { DATE_PRESETS, type DatePreset } from '@/lib/datePresets'
import { cn } from '@/lib/utils'

type PeriodFilterProps = {
  desde: string
  hasta: string
  onDesde: (v: string) => void
  onHasta: (v: string) => void
  onApplyPreset: (p: DatePreset) => void
  onReset: () => void
  /** Texto auxiliar a la derecha (desktop). Omitir o `false` para ocultar. */
  hint?: string | false
}

export function PeriodFilter({
  desde,
  hasta,
  onDesde,
  onHasta,
  onApplyPreset,
  onReset,
  hint = 'Filtra métricas, gráficos y lista de gastos',
}: PeriodFilterProps) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card/60 backdrop-blur-sm px-4 py-3.5 flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground shrink-0">
        <BarChart3 className="w-3.5 h-3.5" />
        Período
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5">
          <label className="text-[11px] text-muted-foreground">Desde</label>
          <Input
            type="date"
            value={desde}
            max={hasta || undefined}
            onChange={(e) => onDesde(e.target.value)}
            className="h-8 w-[140px] text-xs"
          />
        </div>
        <div className="flex items-center gap-1.5">
          <label className="text-[11px] text-muted-foreground">Hasta</label>
          <Input
            type="date"
            value={hasta}
            min={desde || undefined}
            onChange={(e) => onHasta(e.target.value)}
            className="h-8 w-[140px] text-xs"
          />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {DATE_PRESETS.map((p) => {
          const active = desde === p.desde && hasta === p.hasta
          return (
            <button
              key={p.label}
              type="button"
              onClick={() => onApplyPreset(p)}
              className={cn(
                'text-[11px] rounded-full border px-2.5 py-1 transition-colors',
                active
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'text-muted-foreground hover:bg-muted/40 hover:text-foreground',
              )}
            >
              {p.label}
            </button>
          )
        })}
        <button
          type="button"
          onClick={onReset}
          className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
        >
          ↺ Resetear
        </button>
      </div>
      {hint !== false && hint && (
        <p className="text-[10px] text-muted-foreground/70 ml-auto hidden sm:block">{hint}</p>
      )}
    </div>
  )
}
