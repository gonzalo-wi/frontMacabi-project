import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  BarChart3,
  Clock,
  Download,
  ExternalLink,
  Loader2,
  Plus,
  Receipt,
  Search,
  Settings2,
  Tag,
  Trash2,
  TrendingUp,
  XCircle,
} from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as XLSX from 'xlsx'

import { ActionButton } from '@/components/ActionButton'
import { PageHeader } from '@/components/PageHeader'
import { SelectFilter } from '@/components/SelectFilter'
import { ExpenseStatusBadge } from '@/features/expenses/components/ExpenseStatusBadge'
import { PaginationControls } from '@/components/data/PaginationControls'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  createCategory,
  deleteCategory,
  getCategories,
  getExpenseAnalytics,
  listAllExpenses,
} from '@/features/expenses/api/expensesApi'
import { ExpensesByProjectPie } from '@/features/expenses/components/analytics/ExpensesByProjectPie'
import { ExpensesBarChart } from '@/features/expenses/components/analytics/ExpensesBarChart'
import type { ExpenseStatus } from '@/features/expenses/model/types'
import { listProjects } from '@/features/projects/api/projectsApi'
import { ApiError } from '@/lib/api/apiClient'
import { formatARS } from '@/lib/currency'
import { DATE_PRESETS, DEFAULT_DESDE, DEFAULT_HASTA, type DatePreset } from '@/lib/datePresets'
import { PAGE_SIZE } from '@/lib/pagination'
import { EXPENSE_STATUS_FILTER_OPTIONS } from '@/lib/status'
import { useAuth } from '@/hooks/useAuth'
import { useSearchParamState } from '@/hooks/useSearchParamState'
import { cn } from '@/lib/utils'

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
  const queryClient = useQueryClient()
  const [, setSearchParams] = useSearchParams()
  const [query, setQuery] = useSearchParamState('q', '')
  const [projectFilter, setProjectFilter] = useSearchParamState('proyecto', 'all')
  const [statusRaw, setStatusFilter] = useSearchParamState('estado', 'all')
  const statusFilter = statusRaw as ExpenseStatus | 'all'
  const [desde, setDesde] = useSearchParamState('desde', DEFAULT_DESDE)
  const [hasta, setHasta] = useSearchParamState('hasta', DEFAULT_HASTA)

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
  const [page, setPage] = useState(1)
  const [exportOpen, setExportOpen] = useState(false)
  const [catOpen, setCatOpen] = useState(false)
  const [newCatName, setNewCatName] = useState('')
  const [catError, setCatError] = useState<string | null>(null)
  const [exportDesde, setExportDesde] = useState(DEFAULT_DESDE)
  const [exportHasta, setExportHasta] = useState(DEFAULT_HASTA)
  const [exportProject, setExportProject] = useState<string>('all')
  const [exportStatus, setExportStatus] = useState<string>('all')
  const [downloading, setDownloading] = useState(false)

  function openExportDialog() {
    setExportDesde(desde || DEFAULT_DESDE)
    setExportHasta(hasta || DEFAULT_HASTA)
    setExportProject(projectFilter)
    setExportStatus(statusFilter)
    setExportOpen(true)
  }

  function applyExportPreset(p: DatePreset) {
    setExportDesde(p.desde)
    setExportHasta(p.hasta)
  }

  useEffect(() => {
    setPage(1)
  }, [query, projectFilter, statusFilter, desde, hasta])

  async function handleDownloadExcel() {
    if (!token || downloading) return
    setDownloading(true)
    try {
      const FETCH_SIZE = 500
      const filters = {
        pageSize: FETCH_SIZE,
        projectId: exportProject,
        status: exportStatus,
        from: exportDesde || undefined,
        to: exportHasta || undefined,
      }
      const first = await listAllExpenses(token, { ...filters, page: 1 })
      let all = [...first.data]
      if (first.total_pages > 1) {
        const rest = await Promise.all(
          Array.from({ length: first.total_pages - 1 }, (_, i) =>
            listAllExpenses(token, { ...filters, page: i + 2 }),
          ),
        )
        rest.forEach((r) => all.push(...r.data))
      }

      const rows = all.map((e) => ({
        Fecha: new Date(`${e.expense_date}T12:00:00`).toLocaleDateString('es-AR', {
          day: '2-digit', month: '2-digit', year: 'numeric',
        }),
        Proyecto: e.project_name ?? '',
        Categoría: e.category_name ?? '',
        Descripción: e.description,
        'Monto (ARS)': parseFloat(e.amount),
        Estado: e.status,
        'Cargado por': e.submitter_name ?? '',
      }))

      const ws = XLSX.utils.json_to_sheet(rows)
      ws['!cols'] = [
        { wch: 12 }, { wch: 28 }, { wch: 18 }, { wch: 40 },
        { wch: 14 }, { wch: 12 }, { wch: 22 },
      ]
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Gastos')

      const desdeLabel = exportDesde ? exportDesde.replace(/-/g, '') : 'inicio'
      const hastaLabel = exportHasta ? exportHasta.replace(/-/g, '') : 'hoy'
      XLSX.writeFile(wb, `gastos_${desdeLabel}_${hastaLabel}.xlsx`)
      setExportOpen(false)
    } finally {
      setDownloading(false)
    }
  }

  const enabled = Boolean(token) && !isRestoring

  const categoriesQ = useQuery({
    queryKey: ['expense-categories', token],
    enabled,
    queryFn: () => getCategories(token!),
    staleTime: 5 * 60_000,
  })
  const categories = categoriesQ.data ?? []

  const createCatM = useMutation({
    mutationFn: (name: string) => createCategory(token!, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense-categories'] })
      setNewCatName('')
      setCatError(null)
    },
    onError: () => setCatError('No se pudo crear la categoría. Puede que el nombre ya exista.'),
  })

  const deleteCatM = useMutation({
    mutationFn: (id: string) => deleteCategory(token!, id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['expense-categories'] }),
    onError: () => setCatError('No se puede eliminar: hay gastos asociados a esta categoría.'),
  })

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
            <ActionButton intent="secondary" onClick={() => { setCatError(null); setNewCatName(''); setCatOpen(true) }}>
              <Settings2 className="w-4 h-4 mr-1" />
              Categorías
            </ActionButton>
            <ActionButton intent="secondary" onClick={openExportDialog}>
              <Download className="w-4 h-4 mr-1" />
              Exportar Excel
            </ActionButton>
          </div>
        }
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
                onChange={(e) => { setDesde(e.target.value); setPage(1) }}
                className="h-8 w-[140px] text-xs"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <label className="text-[11px] text-muted-foreground">Hasta</label>
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
              <SelectFilter
                value={projectFilter}
                onValueChange={setProjectFilter}
                placeholder="Proyecto"
                triggerClassName="h-10"
                options={[
                  { value: 'all', label: 'Todos los proyectos' },
                  ...projectOptions.map((p) => ({ value: p.id, label: p.name })),
                ]}
              />
              <SelectFilter
                value={statusFilter}
                onValueChange={(v) => setStatusFilter(v as ExpenseStatus | 'all')}
                placeholder="Estado"
                triggerClassName="h-10"
                options={EXPENSE_STATUS_FILTER_OPTIONS}
              />
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
                          {exp.category_name && (
                            <Badge variant="outline" className="text-[10px] font-medium px-1.5 py-0 h-4 gap-0.5 text-violet-700 bg-violet-50 border-violet-200 dark:bg-violet-950/30 dark:text-violet-300 dark:border-violet-800/60">
                              <Tag className="w-2.5 h-2.5" />
                              {exp.category_name}
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

      {/* ─── Export dialog ─── */}
      <Dialog open={exportOpen} onOpenChange={(o) => { if (!downloading) setExportOpen(o) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                <Download className="w-4 h-4 text-primary" />
              </div>
              Exportar gastos
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Presets */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Período
              </Label>
              <div className="flex flex-wrap gap-1.5">
                {DATE_PRESETS.map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => applyExportPreset(p)}
                    className={cn(
                      'px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors',
                      exportDesde === p.desde && exportHasta === p.hasta
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background border-border hover:bg-muted',
                    )}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Manual dates */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="exp-desde" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Desde
                </Label>
                <Input
                  id="exp-desde"
                  type="date"
                  value={exportDesde}
                  max={exportHasta || undefined}
                  onChange={(e) => setExportDesde(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="exp-hasta" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Hasta
                </Label>
                <Input
                  id="exp-hasta"
                  type="date"
                  value={exportHasta}
                  min={exportDesde || undefined}
                  onChange={(e) => setExportHasta(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
            </div>

            {/* Project */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Proyecto
              </Label>
              <Select value={exportProject} onValueChange={setExportProject}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los proyectos</SelectItem>
                  {projectOptions.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Status */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Estado
              </Label>
              <Select value={exportStatus} onValueChange={setExportStatus}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  <SelectItem value="PENDIENTE">Pendiente</SelectItem>
                  <SelectItem value="APROBADO">Aprobado</SelectItem>
                  <SelectItem value="RECHAZADO">Rechazado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <ActionButton
                intent="secondary"
                onClick={() => setExportOpen(false)}
                disabled={downloading}
              >
                Cancelar
              </ActionButton>
              <ActionButton
                intent="primary"
                onClick={handleDownloadExcel}
                disabled={downloading || !exportDesde || !exportHasta}
              >
                {downloading
                  ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" />Descargando…</>
                  : <><Download className="w-4 h-4 mr-1" />Descargar</>}
              </ActionButton>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── Categories manager ─── */}
      <Dialog open={catOpen} onOpenChange={(o) => { if (!createCatM.isPending) setCatOpen(o) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-950/40 shrink-0">
                <Tag className="w-4 h-4 text-violet-600 dark:text-violet-400" />
              </div>
              Categorías de gastos
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Create */}
            <div className="flex gap-2">
              <Input
                placeholder="Nueva categoría…"
                value={newCatName}
                onChange={(e) => { setNewCatName(e.target.value); setCatError(null) }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newCatName.trim()) createCatM.mutate(newCatName.trim())
                }}
                className="h-9 text-sm"
              />
              <ActionButton
                intent="primary"
                onClick={() => { if (newCatName.trim()) createCatM.mutate(newCatName.trim()) }}
                disabled={!newCatName.trim() || createCatM.isPending}
              >
                {createCatM.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              </ActionButton>
            </div>

            {catError && (
              <p className="text-xs text-destructive">{catError}</p>
            )}

            {/* List */}
            <div className="border rounded-lg divide-y max-h-64 overflow-y-auto">
              {categories.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-6">
                  Todavía no hay categorías.
                </p>
              )}
              {categories.map((cat) => (
                <div key={cat.id} className="flex items-center gap-2 px-3 py-2.5">
                  <Tag className="w-3.5 h-3.5 text-violet-500 shrink-0" />
                  <span className="flex-1 text-sm">{cat.name}</span>
                  <button
                    type="button"
                    onClick={() => { setCatError(null); deleteCatM.mutate(cat.id) }}
                    disabled={deleteCatM.isPending}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    title="Eliminar categoría"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex justify-end">
              <ActionButton intent="secondary" onClick={() => setCatOpen(false)}>
                Cerrar
              </ActionButton>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
