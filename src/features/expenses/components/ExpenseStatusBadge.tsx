import { Badge } from '@/components/ui/badge'
import type { ExpenseStatus } from '@/features/expenses/model/types'
import { cn } from '@/lib/utils'

const expenseLabels: Record<ExpenseStatus, string> = {
  PENDIENTE: 'Pendiente',
  APROBADO: 'Aprobado',
  RECHAZADO: 'Rechazado',
}

const expenseClass: Record<ExpenseStatus, string> = {
  PENDIENTE:
    'border-amber-200/80 bg-amber-100 text-amber-950 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-100',
  APROBADO:
    'border-emerald-200/80 bg-emerald-100 text-emerald-950 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-100',
  RECHAZADO:
    'border-red-200/80 bg-red-100 text-red-950 dark:border-red-900 dark:bg-red-950/60 dark:text-red-100',
}

export function ExpenseStatusBadge({
  status,
  className,
}: {
  status: ExpenseStatus
  className?: string
}) {
  return (
    <Badge variant="outline" className={cn(expenseClass[status], className)}>
      {expenseLabels[status]}
    </Badge>
  )
}
