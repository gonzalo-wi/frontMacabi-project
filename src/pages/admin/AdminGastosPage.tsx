import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  BarChart3,
  Clock,
  ExternalLink,
  Receipt,
  Search,
  TrendingUp,
  XCircle,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'

import { PageHeader } from '@/components/PageHeader'
import { ExpenseStatusBadge } from '@/components/StatusBadge'
import { PaginationControls } from '@/components/admin/PaginationControls'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { getExpenseAnalytics, listAllExpenses } from '@/features/expenses/api/expensesApi'
import { ExpensesByProjectPie } from '@/features/expenses/components/analytics/ExpensesByProjectPie'
import { ExpensesBarChart } from '@/features/expenses/components/analytics/ExpensesBarChart'
import type { ExpenseStatus } from '@/features/expenses/model/types'
import { listProjects } from '@/features/projects/api/projectsApi'
import { ApiError } from '@/lib/api/apiClient'
import { formatARS } from '@/lib/currency'
import { PAGE_SIZE } from '@/lib/pagination'
import { useAuth } from '@/hooks/useAuth'
import { useSearchParamState } from '@/hooks/useSearchParamState'
import { cn } from '@/lib/utils'

// ─── Date helpers (presets) ───────────────────────────────────
function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
// Defaults = mes actual (se usan como valores iniciales en useSearchParamState)
const _now = new Date()
const DEFAULT_DESDE = isoDate(new Date(_now.getFullYear(), _now.getMonth(), 1))
const DEFAULT_HASTA = isoDate(_now)

type DatePreset = { label: string; desde: string; hasta: string }
const DATE_PRESETS: DatePreset[] = [
  {
    label: 'Este mes',
    desde: isoDate(new Date(_now.getFullYear(), _now.getMonth(), 1)),
    hasta: isoDate(_now),
  },
  {
    label: 'Mes anterior',
    desde: isoDate(new Date(_now.getFullYear(), _now.getMonth() - 1, 1)),
    hasta: isoDate(new Date(_now.getFullYear(), _now.getMonth(), 0)),
  },
  {
    label: 'Últimos 6 meses',
    desde: isoDate(new Date(_now.getFullYear(), _now.getMonth() - 5, 1)),
    hasta: isoDate(_now),
  },
  {
    label: 'Este año',
    desde: isoDate(new Date(_now.getFullYear(), 0, 1)),
    hasta: isoDate(_now),
  },
]

// ─── Formatters ───────────────────────────────────────────────
function expenseDate(iso: string) {
  return new Date(`${iso}T12:00:00`).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  })
}

function projectAvatarColor(name: string): string {
  const colors = [
    'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300',
    'bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300',
    'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300',
    'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300',
    'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300',
    'bg-cyan-100 text-cyan-700 dark:bg-cyan-950/60 dark:text-cyan-300',
  ]
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return colors[Math.abs(hash) % colors.length]
}

function statusLeftBorder(status: ExpenseStatus) {
  switch (status) {
    case 'APROBADO':
      return 'border-l-emerald-500 dark:border-l-emerald-600'
    case 'RECHAZADO':
      return 'border-l-red-400 dark:border-l-red-600'
    default:
      return 'border-l-amber-400 dark:border-l-amber-500'
  }
}

// ─── MetricCard ───────────────────────────────────────────────
type MetricCardProps = {
  title: string
  value: string
  icon: React.ReactNode
  tone?: 'default' | 'warn' | 'green' | 'red'
  sub?: string
  loading?: boolean
}

function MetricCard({ title, value, icon, tone = 'default', sub, loading }: MetricCardProps) {
  return (
    <Card
      className={cn(
        'rounded-2xl shadow-sm overflow-hidden',
        tone === 'warn' && 'border-amber-200 bg-amber-50/60 dark:border-amber-800/60 dark:bg-amber-950/20',
        tone === 'green' && 'border-emerald-200 bg-emerald-50/60 dark:border-emerald-800/60 dark:bg-emerald-950/20',
        tone === 'red' && 'border-red-200/70 bg-red-50/40 dark:border-red-900/60 dark:bg-red-950/20',
      )}
    >
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
              {title}
            </p>
            {loading ? (
              <div className="h-7 w-24 bg-muted/60 rounded animate-pulse" />
            ) : (
              <p className="text-2xl font-bold tabular-nums text-foreground leading-none">{value}</p>
            )}
            {sub && !loading && <p className="text-xs text-muted-foreground mt-1.5">{sub}</p>}
          </div>
          <div
            className={cn(
              'rounded-xl p-2 shrink-0',
              tone === 'warn' ? 'bg-amber-100 dark:bg-amber-900/40' : '',
              tone === 'green' ? 'bg-emerald-100 dark:bg-emerald-900/40' : '',
              tone === 'red' ? 'bg-red-100 dark:bg-red-900/40' : '',
              tone === 'default' ? 'bg-primary/10' : '',
            )}
          >
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Page ─────────────────────────────────────────────────────
export default function AdminGastosPage() {
  const { token, isRestoring } = useAuth()
  const [, setSearchParams] = useSearchParams()
  const [query, setQuery] = useSearchParamState('q', '')
  const [projectFilter, setProjectFilter] = useSearchParamState('proyecto', 'all')
  const [statusRaw, setStatusFilter] = useSearchParamState('estado', 'all')
  const statusFilter = statusRaw as ExpenseStatus | 'all'
  const [desde, setDesde] = useSearchParamState('desde', DEFAULT_DESDE)
  const [hasta, setHasta] = useSearchParamState('hasta', DEFAULT_HASTA)

  /** Dado un "desde", devuelve el mínimo permitido (máximo 1 año atrás desde "hasta"). */
  function clampDesde(newDesde: string, currentHasta: string): string {
    if (!newDesde || !currentHasta) return newDesde
    const minDesde = isoDate(new Date(new Date(currentHasta + 'T00:00:00').getTime() - 365 * 24 * 60 * 60 * 1000))
    return newDesde < minDesde ? minDesde : newDesde
  }
  /** Dado un "hasta", devuelve el máximo permitido (máximo 1 año adelante desde "desde"). */
  function clampHasta(currentDesde: string, newHasta: string): string {
    if (!currentDesde || !newHasta) return newHasta
    const maxHasta = isoDate(new Date(new Date(currentDesde + 'T00:00:00').getTime() + 365 * 24 * 60 * 60 * 1000))
    return newHasta > maxHasta ? maxHasta : newHasta
  }

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
        // Resetear = mes actual (nunca dejamos el rango abierto)
        params.delete('desde')
        params.delete('hasta')
        return params
      },
      { replace: true },
    )
    setPage(1)
  }
  const [page, setPage] = useState(1)

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
        action={null}
      />

      <div className="px-3 py-4 sm:px-4 lg:px-6 lg:py-6 max-w-6xl mx-auto space-y-5">
        {/* ── Filtro de período global — afecta métricas, gráficos Y lista ── */}
        <div className="rounded-2xl border border-border/60 bg-card/60 backdrop-blur-sm px-4 py-3.5 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground shrink-0">
            <BarChart3 className="w-3.5 h-3.5" />
            Período
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5">
              <label className="text-[11px] text-muted-foreground">Desde</label>
              <Input
                type="date"
                value={desde}
                max={hasta || undefined}
                min={hasta ? isoDate(new Date(new Date(hasta + 'T00:00:00').getTime() - 365 * 24 * 60 * 60 * 1000)) : undefined}
                onChange={(e) => { setDesde(clampDesde(e.target.value, hasta)); setPage(1) }}
                className="h-8 w-[140px] text-xs"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <label className="text-[11px] text-muted-foreground">Hasta</label>
              <Input
                type="date"
                value={hasta}
                min={desde || undefined}
                max={desde ? isoDate(new Date(new Date(desde + 'T00:00:00').getTime() + 365 * 24 * 60 * 60 * 1000)) : undefined}
                onChange={(e) => { setHasta(clampHasta(desde, e.target.value)); setPage(1) }}
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
          <p className="text-[10px] text-muted-foreground/70 ml-auto hidden sm:block">
            Filtra métricas, gráficos y lista de gastos
          </p>
        </div>

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

        {/* ── Gráficos ── */}
        <Card className="rounded-2xl shadow-sm overflow-hidden">
          <CardHeader className="px-4 sm:px-6 pt-4 sm:pt-5 pb-3">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary shrink-0" />
              Análisis del período
            </CardTitle>
            <CardDescription className="mt-0.5 text-xs">
              Montos aprobados. Barras por día si el rango ≤ 62 días, o por mes si es mayor.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-4 sm:px-6 pb-5">
            {analyticsQ.isError && (
              <p className="text-sm text-destructive">No se pudo cargar el análisis.</p>
            )}
            {analyticsQ.isLoading ? (
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="h-[260px] rounded-xl bg-muted/40 animate-pulse" />
                <div className="h-[260px] rounded-xl bg-muted/40 animate-pulse" />
              </div>
            ) : (
              <div className="grid gap-6 lg:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-2">Por proyecto</p>
                  <ExpensesByProjectPie data={a?.by_project ?? []} />
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-2">
                    Por {a?.granularity === 'day' ? 'día' : 'mes'}
                  </p>
                  <ExpensesBarChart data={a?.by_bucket ?? []} granularity={a?.granularity ?? 'month'} />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Gastos (lista paginada — mismas fechas que el período global) ── */}
        <Card className="rounded-2xl shadow-sm overflow-hidden">
          <CardHeader className="px-4 sm:px-6 pt-4 sm:pt-5 pb-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-primary shrink-0" />
                  Gastos del período
                </CardTitle>
                <CardDescription className="mt-0.5 text-xs">
                  Mismo rango de fechas que los gráficos. Filtrá además por proyecto, estado o descripción.
                </CardDescription>
              </div>
              {listQ.data && (
                <span className="text-xs text-muted-foreground tabular-nums bg-muted/40 border rounded-full px-2.5 py-0.5">
                  {listQ.data.total} resultado{listQ.data.total !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          </CardHeader>

          <CardContent className="space-y-4 px-4 sm:px-6 pb-5">
            {/* Filtros secundarios (proyecto / estado / búsqueda — se suman al período) */}
            <div className="grid gap-2 sm:grid-cols-[1fr_180px_160px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Descripción, proyecto o persona…"
                  className="pl-9 h-10 bg-muted/30 border-border/60 focus:bg-background"
                />
              </div>
              <Select value={projectFilter} onValueChange={setProjectFilter}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Proyecto" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los proyectos</SelectItem>
                  {projectOptions.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as ExpenseStatus | 'all')}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  <SelectItem value="PENDIENTE">Pendiente</SelectItem>
                  <SelectItem value="APROBADO">Aprobado</SelectItem>
                  <SelectItem value="RECHAZADO">Rechazado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {listQ.isError && (
              <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                {listQ.error instanceof ApiError ? listQ.error.message : 'No se pudieron cargar los gastos'}
              </div>
            )}

            {listQ.isLoading && (
              <div className="space-y-2">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-16 rounded-xl bg-muted/40 animate-pulse" style={{ opacity: 1 - i * 0.25 }} />
                ))}
              </div>
            )}

            {!listQ.isLoading && expenses.length > 0 && (
              <div className="space-y-2">
                {expenses.map((exp) => (
                  <Link
                    key={exp.id}
                    to={`/app/admin/gastos/${exp.id}`}
                    className={cn(
                      'block rounded-xl border-l-[3px] border border-border/70 bg-card overflow-hidden shadow-sm transition-colors hover:bg-muted/20',
                      statusLeftBorder(exp.status),
                    )}
                  >
                    <div className="px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-foreground leading-tight">
                            {exp.description}
                          </p>
                          {exp.project_name && (
                            <Badge
                              variant="outline"
                              className={cn('text-[10px] font-medium px-1.5 py-0 h-4', projectAvatarColor(exp.project_name))}
                            >
                              {exp.project_name}
                            </Badge>
                          )}
                          <ExpenseStatusBadge status={exp.status} />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {expenseDate(exp.expense_date)}
                          {exp.submitter_name && (
                            <span className="ml-1.5">
                              · <span className="text-foreground/70">{exp.submitter_name}</span>
                            </span>
                          )}
                        </p>
                      </div>
                      <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                        <p className="font-bold text-base tabular-nums text-foreground">
                          {formatARS(exp.amount)}
                        </p>
                        <ExternalLink className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {!listQ.isLoading && expenses.length === 0 && !listQ.isError && (
              <div className="flex flex-col items-center gap-3 py-12 text-center border border-dashed rounded-xl">
                <Receipt className="w-10 h-10 text-muted-foreground/25" />
                <p className="text-sm text-muted-foreground">
                  No hay gastos para los filtros seleccionados.
                </p>
              </div>
            )}

            <PaginationControls
              page={page}
              totalPages={listQ.data?.total_pages ?? 1}
              onPageChange={setPage}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
