import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Download, Receipt, Settings2 } from 'lucide-react'

import { ActionButton } from '@/components/ActionButton'
import { PageHeader } from '@/components/PageHeader'
import { useAdminGastosPage } from '@/features/expenses/hooks/useAdminGastosPage'
import type { ExpenseStatus } from '@/features/expenses/model/types'
import { DEFAULT_DESDE, DEFAULT_HASTA, type DatePreset } from '@/lib/datePresets'
import { useAuth } from '@/hooks/useAuth'
import { useSearchParamState } from '@/hooks/useSearchParamState'

import { AnalyticsCard } from '@/features/expenses/components/admin/AnalyticsCard'
import { CategoriesDialog } from '@/features/expenses/components/admin/CategoriesDialog'
import { ExpensesListCard } from '@/features/expenses/components/admin/ExpensesListCard'
import { ExportDialog } from '@/features/expenses/components/admin/ExportDialog'
import { ExpenseStatusMetricsGrid } from '@/features/expenses/components/ExpenseStatusMetricsGrid'
import { PeriodFilter } from '@/features/expenses/components/PeriodFilter'
import { metricsFromAnalytics } from '@/features/expenses/lib/expenseMetrics'

export default function AdminGastosPage() {
  const { token, isRestoring } = useAuth()
  const [, setSearchParams] = useSearchParams()
  const [query, setQuery] = useSearchParamState('q', '')
  const [projectFilter, setProjectFilter] = useSearchParamState('proyecto', 'all')
  const [statusRaw, setStatusFilter] = useSearchParamState('estado', 'all')
  const statusFilter = statusRaw as ExpenseStatus | 'all'
  const [desde, setDesde] = useSearchParamState('desde', DEFAULT_DESDE)
  const [hasta, setHasta] = useSearchParamState('hasta', DEFAULT_HASTA)

  const [exportOpen, setExportOpen] = useState(false)
  const [catOpen, setCatOpen] = useState(false)

  const {
    page,
    setPage,
    analyticsQ,
    listQ,
    projectOptions,
    expenses,
  } = useAdminGastosPage(token, isRestoring, {
    query,
    projectFilter,
    statusFilter,
    desde,
    hasta,
  })

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

  const a = analyticsQ.data

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

        <ExpenseStatusMetricsGrid
          metrics={a ? metricsFromAnalytics(a) : undefined}
          loading={analyticsQ.isLoading}
          showProjectsCard
          projectsWithExpenses={a?.by_project.length ?? 0}
        />

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
