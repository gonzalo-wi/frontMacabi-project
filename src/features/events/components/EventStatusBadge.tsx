import { cn } from '@/lib/utils'
import { labelInstanceStatus } from '@/features/events/lib/eventLabels'

const STATUS_CLS: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-700 border-slate-200',
  open: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  closed: 'bg-slate-100 text-slate-600 border-slate-200',
  cancelled: 'bg-red-50 text-red-800 border-red-200',
}

export function EventStatusBadge({ status }: { status: string }) {
  const cls =
    STATUS_CLS[status] ?? 'bg-muted text-muted-foreground border-border'
  return (
    <span
      className={cn(
        'inline-flex max-w-[14rem] items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold leading-tight tracking-tight whitespace-normal text-center',
        cls,
      )}
    >
      {labelInstanceStatus(status)}
    </span>
  )
}
