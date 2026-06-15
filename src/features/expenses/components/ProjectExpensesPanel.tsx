import { useMemo, useState } from 'react'
import { CreditCard } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  getProjectExpenseSummary,
  listProjectExpenses,
} from '@/features/expenses/api/expensesApi'
import { ExpenseFormDialog } from '@/features/expenses/components/ExpenseFormDialog'
import { ExpensesList } from '@/features/expenses/components/ExpensesList'
import { ExpenseStatusMetricsGrid } from '@/features/expenses/components/ExpenseStatusMetricsGrid'
import { PeriodFilter } from '@/features/expenses/components/PeriodFilter'
import { ProjectBudgetBanner } from '@/features/expenses/components/ProjectBudgetBanner'
import { metricsFromSummary } from '@/features/expenses/lib/expenseMetrics'
import { fetchAllPages } from '@/lib/api/fetchAllPages'
import { formatARS } from '@/lib/currency'
import { formatMonth } from '@/lib/date'
import { DEFAULT_DESDE, DEFAULT_HASTA, type DatePreset } from '@/lib/datePresets'
import { EXPENSE_STATUS_ORDER } from '@/features/expenses/lib/status'
import { queryKeys } from '@/lib/queryKeys'
import { useClientPagination } from '@/hooks/useClientPagination'

type Props = {
  token: string
  projectId: string
  /** Base path del detalle. Admin: '/app/admin/gastos'; coordinador: '/app/gastos'. */
  detailBasePath?: string
  /** Solo el admin puede editar el presupuesto mensual. */
  canEditBudget?: boolean
  /** Mostrar el botón "Nuevo gasto" del header del panel (se oculta si la página ya tiene uno). */
  showNewExpenseButton?: boolean
}

export function ProjectExpensesPanel({
  token,
  projectId,
  detailBasePath = '/app/admin/gastos',
  canEditBudget = false,
  showNewExpenseButton = true,
}: Props) {
  const [desde, setDesde] = useState(DEFAULT_DESDE)
  const [hasta, setHasta] = useState(DEFAULT_HASTA)

  function applyDatePreset(p: DatePreset) {
    setDesde(p.desde)
    setHasta(p.hasta)
  }

  function resetDates() {
    setDesde(DEFAULT_DESDE)
    setHasta(DEFAULT_HASTA)
  }

  const expensesQ = useQuery({
    queryKey: queryKeys.expenses.projectList(projectId, token),
    queryFn: () => fetchAllPages((p) => listProjectExpenses(token, projectId, p, 50)),
    enabled: Boolean(token && projectId),
  })

  const summaryQ = useQuery({
    queryKey: queryKeys.expenses.projectSummary(projectId, token, desde, hasta),
    queryFn: () => getProjectExpenseSummary(token, projectId, desde || undefined, hasta || undefined),
    enabled: Boolean(token && projectId),
  })

  const sorted = useMemo(() => {
    const order = EXPENSE_STATUS_ORDER
    let rows = [...(expensesQ.data ?? [])].sort((a, b) => {
      const d = order[a.status] - order[b.status]
      if (d !== 0) return d
      return new Date(b.expense_date).getTime() - new Date(a.expense_date).getTime()
    })
    if (desde) rows = rows.filter((e) => e.expense_date >= desde)
    if (hasta) rows = rows.filter((e) => e.expense_date <= hasta)
    return rows
  }, [expensesQ.data, desde, hasta])

  const { page, setPage, totalPages, pageItems } = useClientPagination(sorted, {
    resetKey: `${desde}|${hasta}`,
  })

  return (
    <div className="space-y-4 sm:space-y-6">
      <Card className="rounded-2xl shadow-sm overflow-hidden">
        <CardHeader className="flex flex-row items-start justify-between gap-3 px-4 sm:px-6 pt-4 sm:pt-5 pb-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 shrink-0">
              <CreditCard className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-base font-bold">Gastos del proyecto</CardTitle>
              <CardDescription className="mt-0.5 text-xs leading-snug">
                Métricas y listado del período. Tocá un gasto para gestionarlo.
              </CardDescription>
            </div>
          </div>
          {showNewExpenseButton && (
            <ExpenseFormDialog
              token={token}
              projectId={projectId}
              triggerLabel="Nuevo gasto"
              onCreated={async () => {
                await Promise.all([expensesQ.refetch(), summaryQ.refetch()])
              }}
            />
          )}
        </CardHeader>

        <CardContent className="space-y-4 px-4 sm:px-6 pb-5">
          <ProjectBudgetBanner token={token} projectId={projectId} canEdit={canEditBudget} />

          <PeriodFilter
            desde={desde}
            hasta={hasta}
            onDesde={setDesde}
            onHasta={setHasta}
            onApplyPreset={applyDatePreset}
            onReset={resetDates}
            hint="Filtra métricas y lista de gastos"
          />

          <ExpenseStatusMetricsGrid
            metrics={summaryQ.data ? metricsFromSummary(summaryQ.data) : undefined}
            loading={summaryQ.isLoading}
          />

          {summaryQ.data && summaryQ.data.by_month.length > 0 && (
            <div className="rounded-xl border bg-muted/20 px-4 py-3 space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Aprobados por mes
              </p>
              <div className="flex flex-wrap gap-1.5">
                {summaryQ.data.by_month.slice(-6).map((x) => (
                  <span
                    key={x.month}
                    className="inline-flex items-center gap-1.5 rounded-lg border bg-card px-2.5 py-1 text-xs"
                  >
                    <span className="text-muted-foreground">{formatMonth(x.month)}</span>
                    <span className="font-semibold text-foreground tabular-nums">{formatARS(x.total)}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          <ExpensesList
            expenses={pageItems}
            isLoading={expensesQ.isLoading}
            isError={expensesQ.isError}
            error={expensesQ.error}
            detailBasePath={detailBasePath}
            emptyMessage={
              desde || hasta
                ? 'No hay gastos en el rango de fechas seleccionado.'
                : 'No hay gastos registrados para este proyecto.'
            }
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </CardContent>
      </Card>
    </div>
  )
}
