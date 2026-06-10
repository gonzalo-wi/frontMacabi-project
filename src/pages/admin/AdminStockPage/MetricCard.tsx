import type { LucideIcon } from 'lucide-react'

import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export function MetricCard({
  icon: Icon,
  iconClass,
  title,
  value,
  valueClass,
}: {
  icon: LucideIcon
  iconClass: string
  title: string
  value: string
  valueClass?: string
}) {
  return (
    <Card className="rounded-2xl shadow-sm">
      <CardContent className="p-4 flex items-start gap-3">
        <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', iconClass)}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground leading-tight">{title}</p>
          <p className={cn('mt-0.5 text-2xl font-bold tabular-nums', valueClass)}>{value}</p>
        </div>
      </CardContent>
    </Card>
  )
}
