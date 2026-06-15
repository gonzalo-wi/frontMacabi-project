import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

export function StatChip({
  children,
  color = 'neutral',
}: {
  children: ReactNode
  color?: 'neutral' | 'green' | 'amber' | 'orange'
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium tabular-nums',
        color === 'green' &&
          'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300',
        color === 'amber' &&
          'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300',
        color === 'orange' &&
          'border-orange-200 bg-orange-50 text-orange-800 dark:border-orange-800 dark:bg-orange-950/40 dark:text-orange-300',
        color === 'neutral' && 'border-border bg-card text-muted-foreground',
      )}
    >
      {children}
    </span>
  )
}
