import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarDays, CreditCard, Paperclip, TrendingUp } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'

import { ExpenseStatusBadge } from '@/components/StatusBadge'
import { PaginationControls } from '@/components/admin/PaginationControls'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  getProjectExpenseSummary,
  listProjectExpenses,
} from '@/features/expenses/api/expensesApi'
import { ExpenseFormDialog } from '@/features/expenses/components/ExpenseFormDialog'
import { ProjectBudgetBanner } from '@/features/expenses/components/ProjectBudgetBanner'
import type { ExpenseDTO, ExpenseStatus } from '@/features/expenses/model/types'
import { ApiError } from '@/lib/api/apiClient'
import { formatARS } from '@/lib/currency'
import { DATE_PRESETS, DEFAULT_DESDE, DEFAULT_HASTA, type DatePreset } from '@/lib/datePresets'
import { PAGE_SIZE } from '@/lib/pagination'
import { cn } from '@/lib/utils'
import { formatExpenseDate } from '@/lib/date'
import { EXPENSE_STATUS_ORDER } from '@/lib/status'

// ─── Formatters ───────────────────────────────────────────────

function formatMonth(monthStr: string): string {
  const parts = monthStr.split('-')
  if (parts.length < 2) return monthStr
  const [year, month] = parts
  const labels = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
  const idx = parseInt(month, 10) - 1
  return `${labels[idx] ?? month} ${year.slice(2)}`
}

function statusBorderClass(status: ExpenseStatus): string {
  switch (status) {
    case 'APROBADO':  return 'border-l-emerald-500 dark:border-l-emerald-600'
    case 'RECHAZADO': return 'border-l-red-400 dark:border-l-red-600'
    default:          return 'border-l-amber-400 dark:border-l-amber-500'
  }
}

// ─── Skeleton ─────────────────────────────────────────────────

function ExpenseSkeleton() {
  return (
    <div className="space-y-2.5">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-20 rounded-xl bg-muted/50 animate-pulse" style={{ opacity: 1 - i * 0.25 }} />
      ))}
    </div>
  )
}

// ─── Panel ────────────────────────────────────────────────────

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

export function ProjectExpensesPanel({ token, projectId, detailBasePath = '/app/admin/gastos', canEditBudget = false, showNewExpenseButton = true }: Props) {
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const [desde, setDesde] = useState(DEFAULT_DESDE)
  const [hasta, setHasta] = useState(DEFAULT_HASTA)

  function applyDatePreset(p: DatePreset) {
    setDesde(p.desde)
    setHasta(p.hasta)
    setPage(1)
  }

  function resetDates() {
    setDesde(DEFAULT_DESDE)
    setHasta(DEFAULT_HASTA)
    setPage(1)
  }

  const expensesQ = useQuery({
    queryKey: ['project-expenses', projectId, token, page],
    queryFn: () => listProjectExpenses(token, projectId, page, PAGE_SIZE),
    enabled: Boolean(token && projectId),
  })

  const summaryQ = useQuery({
    queryKey: ['project-expense-summary', projectId, token, desde, hasta],
    queryFn: () => getProjectExpenseSummary(token, projectId, desde || undefined, hasta || undefined),
    enabled: Boolean(token && projectId),
  })

  const sorted = useMemo(() => {
    const order = EXPENSE_STATUS_ORDER
    let rows = [...(expensesQ.data?.data ?? [])].sort((a, b) => {
      const d = order[a.status] - order[b.status]
      if (d !== 0) return d
      return new Date(b.expense_date).getTime() - new Date(a.expense_date).getTime()
    })
    // Client-side date filter (list doesn't support backend date params yet)
    if (desde) rows = rows.filter((e) => e.expense_date >= desde)
    if (hasta) rows = rows.filter((e) => e.expense_date <= hasta)
    return rows
  }, [expensesQ.data, desde, hasta])

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
                Solo los <strong className="text-foreground/70">aprobados</strong> suman al total. Tocá un gasto para gestionarlo.
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
          {/* ── Presupuesto mensual ── */}
          <ProjectBudgetBanner token={token} projectId={projectId} canEdit={canEditBudget} />

          {/* ── Filtro de fechas (default: mes actual) ── */}
          <div className="space-y-2.5">
            <div className="flex flex-wrap items-end gap-3">
              <div className="space-y-1">
                <label className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground">
                  <CalendarDays className="w-3 h-3" /> Desde
                </label>
                <Input
                  type="date"
                  value={desde}
                  max={hasta || undefined}
                  onChange={(e) => { setDesde(e.target.value); setPage(1) }}
                  className="h-8 w-[140px] text-xs"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-muted-foreground">Hasta</label>
                <Input
                  type="date"
                  value={hasta}
                  min={desde || undefined}
                  onChange={(e) => { setHasta(e.target.value); setPage(1) }}
                  className="h-8 w-[140px] text-xs"
                />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {DATE_PRESETS.map((p) => {
                const active = desde === p.desde && hasta === p.hasta
                return (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => applyDatePreset(p)}
                    className={cn(
                      'text-[11px] rounded-full border px-2.5 py-1 transition-colors',
                      active
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'text-muted-foreground hover:bg-muted/40 hover:text-foreground',
                    )}
                  >
                    {p.label}
                  </button>
                )
              })}
              <button
                type="button"
                onClick={resetDates}
                className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
              >
                ↺ Resetear
              </button>
            </div>
          </div>

          {/* ── Resumen financiero ── */}
          {summaryQ.data && (
            <div className="rounded-xl border bg-gradient-to-br from-primary/5 via-primary/[0.03] to-transparent p-4 space-y-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-3.5 w-3.5 text-primary shrink-0" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Resumen financiero{desde || hasta ? ' · filtrado' : ''}
                </span>
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground mb-0.5">Total aprobado</p>
                <p className="text-2xl font-bold text-foreground tabular-nums leading-none">
                  {formatARS(summaryQ.data.total_approved)}
                </p>
              </div>
              {summaryQ.data.by_month.length > 0 && (
                <div>
                  <p className="text-[11px] text-muted-foreground mb-2">Por mes</p>
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
              {summaryQ.data.by_month.length === 0 && (
                <p className="text-xs text-muted-foreground/70">Sin movimientos aprobados en el rango.</p>
              )}
            </div>
          )}

          {/* ── Lista ── */}
          {expensesQ.isLoading && <ExpenseSkeleton />}

          {expensesQ.isError && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              {expensesQ.error instanceof ApiError ? expensesQ.error.message : 'Error al cargar los gastos'}
            </div>
          )}

          {!expensesQ.isLoading && !expensesQ.isError && sorted.length === 0 && (
            <div className="flex flex-col items-center gap-3 py-12 text-center border border-dashed rounded-xl">
              <CreditCard className="w-10 h-10 text-muted-foreground/25" />
              <p className="text-sm text-muted-foreground">
                {desde || hasta ? 'No hay gastos en el rango de fechas seleccionado.' : 'No hay gastos registrados para este proyecto.'}
              </p>
            </div>
          )}

          {sorted.length > 0 && (
            <div className="space-y-2.5">
              {sorted.map((exp) => (
                <ExpenseRow
                  key={exp.id}
                  exp={exp}
                  onClick={() => navigate(`${detailBasePath}/${exp.id}`)}
                />
              ))}
            </div>
          )}

          <PaginationControls
            page={page}
            totalPages={expensesQ.data?.total_pages ?? 1}
            onPageChange={setPage}
          />
        </CardContent>
      </Card>
    </div>
  )
}

// ─── ExpenseRow ────────────────────────────────────────────────

function ExpenseRow({ exp, onClick }: { exp: ExpenseDTO; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full text-left rounded-xl border-l-[3px] border border-border bg-card overflow-hidden shadow-sm transition-all hover:shadow-md hover:border-primary/20 cursor-pointer',
        statusBorderClass(exp.status),
      )}
    >
      <div className="px-4 py-3.5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
          <div className="flex items-center gap-2.5">
            <span className="font-bold text-base tabular-nums text-foreground">{formatARS(exp.amount)}</span>
            <ExpenseStatusBadge status={exp.status} />
          </div>
          <span className="text-xs text-muted-foreground tabular-nums">
            {formatExpenseDate(exp.expense_date)}
          </span>
        </div>

        {exp.description && (
          <p className="text-sm text-foreground/80 leading-snug">{exp.description}</p>
        )}

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {exp.submitter_name && (
            <span>
              Cargado por <span className="font-medium text-foreground/70">{exp.submitter_name}</span>
            </span>
          )}
          {exp.receipt_storage_path && (
            <span className="inline-flex items-center gap-1">
              <Paperclip className="w-3.5 h-3.5" />
              Comprobante
            </span>
          )}
          {exp.rejection_reason && (
            <span className="text-destructive font-medium">Motivo: {exp.rejection_reason}</span>
          )}
        </div>
      </div>
    </button>
  )
}
