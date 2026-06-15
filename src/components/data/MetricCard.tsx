import type { ReactNode } from 'react'

import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

type MetricCardProps = {
  title: string
  value: string
  icon: ReactNode
  /** Color semántico de la card y la caja del ícono. */
  tone?: 'default' | 'warn' | 'green' | 'red'
  sub?: string
  loading?: boolean
}

/** Tarjeta de métrica/KPI: título, valor grande, ícono y tono semántico opcional. */
export function MetricCard({ title, value, icon, tone = 'default', sub, loading }: MetricCardProps) {
  return (
    <Card
      className={cn(
        'rounded-2xl shadow-sm overflow-hidden',
        tone === 'warn' && 'border-amber-200 bg-amber-50/60 dark:border-amber-800/60 dark:bg-amber-950/20',
        tone === 'green' && 'border-emerald-200 bg-emerald-50/60 dark:border-emerald-800/60 dark:bg-emerald-950/20',
        tone === 'red' && 'border-red-200/70 bg-red-50/40 dark:border-red-900/60 dark:bg-red-950/20',
      )}
    >
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
              {title}
            </p>
            {loading ? (
              <div className="h-7 w-24 bg-muted/60 rounded animate-pulse" />
            ) : (
              <p className="text-2xl font-bold tabular-nums text-foreground leading-none">{value}</p>
            )}
            {sub && !loading && <p className="text-xs text-muted-foreground mt-1.5">{sub}</p>}
          </div>
          <div
            className={cn(
              'rounded-xl p-2 shrink-0',
              tone === 'warn' ? 'bg-amber-100 dark:bg-amber-900/40' : '',
              tone === 'green' ? 'bg-emerald-100 dark:bg-emerald-900/40' : '',
              tone === 'red' ? 'bg-red-100 dark:bg-red-900/40' : '',
              tone === 'default' ? 'bg-primary/10' : '',
            )}
          >
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
