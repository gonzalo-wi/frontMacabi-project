import { Clock } from 'lucide-react'

import { cn } from '@/lib/utils'
import { formatDeadlineAR, isBeforeDeadline } from '@/features/events/lib/deadline'

export function DeadlineBadge({
  responseDeadlineAt,
  className,
}: {
  responseDeadlineAt: string | null | undefined
  className?: string
}) {
  const open = isBeforeDeadline(responseDeadlineAt)
  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold',
        open
          ? 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100'
          : 'border-muted bg-muted/50 text-muted-foreground',
        className,
      )}
    >
      <Clock className="w-3 h-3 shrink-0" />
      <span>
        {responseDeadlineAt ? `Límite: ${formatDeadlineAR(responseDeadlineAt)}` : 'Sin límite de respuesta'}
        {!open && responseDeadlineAt ? ' · cerrado' : ''}
      </span>
    </div>
  )
}
