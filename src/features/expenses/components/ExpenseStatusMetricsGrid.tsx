import { BarChart3, Clock, TrendingUp, XCircle } from 'lucide-react'

import { MetricCard } from '@/components/data/MetricCard'
import { formatARS } from '@/lib/currency'
import { cn } from '@/lib/utils'

import { expenseCountLabel, type ExpenseStatusMetrics } from '@/features/expenses/lib/expenseMetrics'

type ExpenseStatusMetricsGridProps = {
  metrics: ExpenseStatusMetrics | undefined
  loading?: boolean
  /** Cuarta tarjeta solo en vista admin global. */
  showProjectsCard?: boolean
  projectsWithExpenses?: number
}

export function ExpenseStatusMetricsGrid({
  metrics,
  loading = false,
  showProjectsCard = false,
  projectsWithExpenses = 0,
}: ExpenseStatusMetricsGridProps) {
  const pendingCount = metrics?.pending_count ?? 0
  const rejectedCount = metrics?.rejected_count ?? 0
  const hasPending = pendingCount > 0
  const hasRejected = rejectedCount > 0

  return (
    <div
      className={cn(
        'grid gap-3 sm:grid-cols-2',
        showProjectsCard ? 'lg:grid-cols-4' : 'lg:grid-cols-3',
      )}
    >
      <MetricCard
        title="Aprobados"
        value={formatARS(metrics?.total_approved ?? '0')}
        tone="green"
        loading={loading}
        icon={<TrendingUp className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />}
        sub={expenseCountLabel(metrics?.approved_count ?? 0)}
      />
      <MetricCard
        title="Pendientes"
        value={formatARS(metrics?.pending_total ?? '0')}
        tone={hasPending ? 'warn' : 'default'}
        loading={loading}
        icon={
          <Clock
            className={cn(
              'h-4 w-4',
              hasPending ? 'text-amber-700 dark:text-amber-400' : 'text-muted-foreground',
            )}
          />
        }
        sub={expenseCountLabel(pendingCount)}
      />
      <MetricCard
        title="Rechazados"
        value={formatARS(metrics?.rejected_total ?? '0')}
        tone={hasRejected ? 'red' : 'default'}
        loading={loading}
        icon={
          <XCircle
            className={cn(
              'h-4 w-4',
              hasRejected ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground',
            )}
          />
        }
        sub={expenseCountLabel(rejectedCount)}
      />
      {showProjectsCard && (
        <MetricCard
          title="Proyectos con gastos"
          value={String(projectsWithExpenses)}
          tone="default"
          loading={loading}
          icon={<BarChart3 className="h-4 w-4 text-primary" />}
          sub="Con aprobados en el período"
        />
      )}
    </div>
  )
}
