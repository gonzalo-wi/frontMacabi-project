import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { BarChart3, Clock, Download, Receipt, Settings2, TrendingUp, XCircle } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'

import { ActionButton } from '@/components/ActionButton'
import { MetricCard } from '@/components/data/MetricCard'
import { PageHeader } from '@/components/PageHeader'
import { getExpenseAnalytics, listAllExpenses } from '@/features/expenses/api/expensesApi'
import type { ExpenseStatus } from '@/features/expenses/model/types'
import { listProjects } from '@/features/projects/api/projectsApi'
import { formatARS } from '@/lib/currency'
import { DEFAULT_DESDE, DEFAULT_HASTA, type DatePreset } from '@/lib/datePresets'
import { PAGE_SIZE } from '@/lib/pagination'
import { useAuth } from '@/hooks/useAuth'
import { useSearchParamState } from '@/hooks/useSearchParamState'
import { cn } from '@/lib/utils'

import { AnalyticsCard } from './AnalyticsCard'
import { CategoriesDialog } from './CategoriesDialog'
import { ExpensesListCard } from './ExpensesListCard'
import { ExportDialog } from './ExportDialog'
import { PeriodFilter } from './PeriodFilter'

export default function AdminGastosPage() {
  const { token, isRestoring } = useAuth()
  const [, setSearchParams] = useSearchParams()
  const [query, setQuery] = useSearchParamState('q', '')
  const [projectFilter, setProjectFilter] = useSearchParamState('proyecto', 'all')
  const [statusRaw, setStatusFilter] = useSearchParamState('estado', 'all')
  const statusFilter = statusRaw as ExpenseStatus | 'all'
  const [desde, setDesde] = useSearchParamState('desde', DEFAULT_DESDE)
  const [hasta, setHasta] = useSearchParamState('hasta', DEFAULT_HASTA)

  const [page, setPage] = useState(1)
  const [exportOpen, setExportOpen] = useState(false)
  const [catOpen, setCatOpen] = useState(false)

  /** Aplica un preset en UN solo setSearchParams para evitar que se pisen. */
  function applyDatePreset(p: DatePreset) {
    setSearchParams(
      (prev) => {
        const params = new URLSearchParams(prev)
        if (p.desde === DEFAULT_DESDE) params.delete('desde')
        else params.set('desde', p.desde)
        if (p.hasta === DEFAULT_HASTA) params.delete('hasta')
        else params.set('hasta', p.hasta)
        return params
      },
      { replace: true },
    )
    setPage(1)
  }

  function resetDates() {
    setSearchParams(
      (prev) => {
        const params = new URLSearchParams(prev)
        params.delete('desde')
        params.delete('hasta')
        return params
      },
      { replace: true },
    )
    setPage(1)
  }

  useEffect(() => {
    setPage(1)
  }, [query, projectFilter, statusFilter, desde, hasta])

  const enabled = Boolean(token) && !isRestoring

  const analyticsQ = useQuery({
    queryKey: ['expense-analytics', token, desde, hasta],
    enabled,
    queryFn: () => getExpenseAnalytics(token!, desde || undefined, hasta || undefined),
  })

  const projectsQ = useQuery({
    queryKey: ['admin-projects-min', token],
    enabled,
    queryFn: () => listProjects(token!, 1, 100),
  })

  const listQ = useQuery({
    queryKey: ['admin-expenses-list', token, page, projectFilter, statusFilter, desde, hasta, query],
    enabled,
    queryFn: () =>
      listAllExpenses(token!, {
        page,
        pageSize: PAGE_SIZE,
        projectId: projectFilter,
        status: statusFilter,
        from: desde || undefined,
        to: hasta || undefined,
        q: query,
      }),
  })

  const a = analyticsQ.data
  const projectOptions = projectsQ.data?.data ?? []
  const expenses = listQ.data?.data ?? []
  const pendingCount = a?.pending_count ?? 0
  const hasPending = pendingCount > 0

  return (
    <div className="min-h-screen pb-24">
      <PageHeader
        icon={Receipt}
        title="Gastos"
        subtitle="Vista global: métricas, análisis por período y seguimiento de gastos."
        action={
          <div className="flex items-center gap-2">
            <ActionButton intent="secondary" onClick={() => setCatOpen(true)}>
              <Settings2 className="w-4 h-4 mr-1" />
              Categorías
            </ActionButton>
            <ActionButton intent="secondary" onClick={() => setExportOpen(true)}>
              <Download className="w-4 h-4 mr-1" />
              Exportar Excel
            </ActionButton>
          </div>
        }
      />

      <div className="px-3 py-4 sm:px-4 lg:px-6 lg:py-6 max-w-6xl mx-auto space-y-5">
        <PeriodFilter
          desde={desde}
          hasta={hasta}
          onDesde={(v) => { setDesde(v); setPage(1) }}
          onHasta={(v) => { setHasta(v); setPage(1) }}
          onApplyPreset={applyDatePreset}
          onReset={resetDates}
        />

        {/* ── Métricas (del período seleccionado) ── */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="Total aprobado"
            value={formatARS(a?.total_approved ?? '0')}
            tone="green"
            loading={analyticsQ.isLoading}
            icon={<TrendingUp className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />}
            sub={`${a?.total_count ?? 0} gasto${(a?.total_count ?? 0) !== 1 ? 's' : ''} en el período`}
          />
          <MetricCard
            title="Pendientes"
            value={String(pendingCount)}
            tone={hasPending ? 'warn' : 'default'}
            loading={analyticsQ.isLoading}
            icon={<Clock className={cn('h-4 w-4', hasPending ? 'text-amber-700 dark:text-amber-400' : 'text-muted-foreground')} />}
            sub={hasPending ? 'Requieren revisión' : 'Sin pendientes'}
          />
          <MetricCard
            title="Rechazados"
            value={String(a?.rejected_count ?? 0)}
            tone={(a?.rejected_count ?? 0) > 0 ? 'red' : 'default'}
            loading={analyticsQ.isLoading}
            icon={<XCircle className={cn('h-4 w-4', (a?.rejected_count ?? 0) > 0 ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground')} />}
          />
          <MetricCard
            title="Proyectos con gastos"
            value={String(a?.by_project.length ?? 0)}
            tone="default"
            loading={analyticsQ.isLoading}
            icon={<BarChart3 className="h-4 w-4 text-primary" />}
          />
        </div>

        <AnalyticsCard
          byProject={a?.by_project ?? []}
          byBucket={a?.by_bucket ?? []}
          granularity={a?.granularity ?? 'month'}
          isLoading={analyticsQ.isLoading}
          isError={analyticsQ.isError}
        />

        <ExpensesListCard
          expenses={expenses}
          total={listQ.data?.total}
          isLoading={listQ.isLoading}
          isError={listQ.isError}
          error={listQ.error}
          query={query}
          onQuery={setQuery}
          projectFilter={projectFilter}
          onProjectFilter={setProjectFilter}
          statusFilter={statusFilter}
          onStatusFilter={setStatusFilter}
          projectOptions={projectOptions}
          page={page}
          totalPages={listQ.data?.total_pages ?? 1}
          onPageChange={setPage}
        />
      </div>

      <ExportDialog
        key={exportOpen ? 'export-open' : 'export-closed'}
        open={exportOpen}
        onOpenChange={setExportOpen}
        token={token ?? ''}
        projectOptions={projectOptions}
        initial={{ desde: desde || DEFAULT_DESDE, hasta: hasta || DEFAULT_HASTA, project: projectFilter, status: statusFilter }}
      />

      <CategoriesDialog open={catOpen} onOpenChange={setCatOpen} token={token ?? ''} />
    </div>
  )
}
