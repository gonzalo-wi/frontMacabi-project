import { Link } from 'react-router-dom'
import {
  AlertCircle,
  BarChart3,
  Building2,
  CheckCircle2,
  Clock,
  ExternalLink,
  Receipt,
  Search,
  TrendingUp,
  XCircle,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'

import { PageHeader } from '@/components/PageHeader'
import { ActionButton } from '@/components/ActionButton'
import { ExpenseStatusBadge } from '@/components/StatusBadge'
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
import {
  getProjectExpenseSummary,
  listProjectExpenses,
} from '@/features/expenses/api/expensesApi'
import type { ExpenseDTO, ExpenseStatus } from '@/features/expenses/model/types'
import { listProjects } from '@/features/projects/api/projectsApi'
import type { ProjectDTO } from '@/features/projects/model/types'
import { ApiError } from '@/lib/api/apiClient'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'

// ─────────────────────────────────────────────────────────────────────────────
// Data types & fetchers
// ─────────────────────────────────────────────────────────────────────────────

type ProjectExpenseStats = {
  project: ProjectDTO
  totalApproved: number
  count: number
  pending: number
  approved: number
  rejected: number
  lastExpenseDate: string | null
}

type AdminExpenseRow = ExpenseDTO & { project_name: string }

type DashboardData = {
  projects: ProjectExpenseStats[]
  expenses: AdminExpenseRow[]
}

async function fetchAllProjects(token: string): Promise<ProjectDTO[]> {
  const out: ProjectDTO[] = []
  let page = 1
  while (page <= 25) {
    const r = await listProjects(token, page, 50)
    out.push(...r.data)
    if (page >= r.total_pages) break
    page++
  }
  return out
}

async function fetchAllProjectExpenses(token: string, projectId: string): Promise<ExpenseDTO[]> {
  const out: ExpenseDTO[] = []
  let page = 1
  while (page <= 30) {
    const r = await listProjectExpenses(token, projectId, page, 50)
    out.push(...r.data)
    if (page >= r.total_pages) break
    page++
  }
  return out
}

async function fetchExpenseDashboard(token: string): Promise<DashboardData> {
  const projects = await fetchAllProjects(token)
  const rows = await Promise.all(
    projects.map(async (project) => {
      const [summary, expenses] = await Promise.all([
        getProjectExpenseSummary(token, project.id),
        fetchAllProjectExpenses(token, project.id),
      ])
      const counts: Record<ExpenseStatus, number> = { PENDIENTE: 0, APROBADO: 0, RECHAZADO: 0 }
      for (const exp of expenses) counts[exp.status]++
      const lastExpenseDate = expenses.map((e) => e.expense_date).sort().at(-1) ?? null
      return {
        stats: {
          project,
          totalApproved: Number.parseFloat(summary.total_approved || '0') || 0,
          count: expenses.length,
          pending: counts.PENDIENTE,
          approved: counts.APROBADO,
          rejected: counts.RECHAZADO,
          lastExpenseDate,
        },
        expenses: expenses.map((exp): AdminExpenseRow => ({ ...exp, project_name: project.name })),
      }
    }),
  )
  return {
    projects: rows
      .map((r) => r.stats)
      .sort((a, b) => {
        if (b.pending !== a.pending) return b.pending - a.pending
        if (b.totalApproved !== a.totalApproved) return b.totalApproved - a.totalApproved
        return a.project.name.localeCompare(b.project.name)
      }),
    expenses: rows
      .flatMap((r) => r.expenses)
      .sort((a, b) => {
        const order: Record<ExpenseStatus, number> = { PENDIENTE: 0, APROBADO: 1, RECHAZADO: 2 }
        const byStatus = order[a.status] - order[b.status]
        if (byStatus !== 0) return byStatus
        return new Date(b.expense_date).getTime() - new Date(a.expense_date).getTime()
      }),
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Formatters
// ─────────────────────────────────────────────────────────────────────────────

function money(n: number) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(n)
}

function shortDate(iso: string | null) {
  if (!iso) return 'Sin gastos'
  return new Date(`${iso}T12:00:00`).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  })
}

function expenseDate(iso: string) {
  return new Date(`${iso}T12:00:00`).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  })
}

function parseAmount(amount: string) {
  const n = Number.parseFloat(amount)
  return Number.isNaN(n) ? 0 : n
}

function projectInitial(name: string) {
  return name.trim()[0]?.toUpperCase() ?? 'P'
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

// ─────────────────────────────────────────────────────────────────────────────
// Skeleton
// ─────────────────────────────────────────────────────────────────────────────

function DashboardSkeleton() {
  return (
    <div className="space-y-5">
      {/* Metric cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-24 rounded-2xl bg-muted/50 animate-pulse"
            style={{ opacity: 1 - i * 0.15 }}
          />
        ))}
      </div>
      {/* Expenses card */}
      <div className="rounded-2xl border bg-card p-5 space-y-3">
        <div className="h-5 w-40 bg-muted/50 rounded animate-pulse" />
        <div className="h-10 bg-muted/40 rounded-xl animate-pulse" />
        <div className="space-y-2.5">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-20 rounded-xl bg-muted/40 animate-pulse"
              style={{ opacity: 1 - i * 0.25 }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// MetricCard
// ─────────────────────────────────────────────────────────────────────────────

type MetricCardProps = {
  title: string
  value: string
  icon: React.ReactNode
  tone?: 'default' | 'warn' | 'green' | 'red'
  sub?: string
}

function MetricCard({ title, value, icon, tone = 'default', sub }: MetricCardProps) {
  return (
    <Card
      className={cn(
        'rounded-2xl shadow-sm overflow-hidden',
        tone === 'warn' &&
          'border-amber-200 bg-amber-50/60 dark:border-amber-800/60 dark:bg-amber-950/20',
        tone === 'green' &&
          'border-emerald-200 bg-emerald-50/60 dark:border-emerald-800/60 dark:bg-emerald-950/20',
        tone === 'red' &&
          'border-red-200/70 bg-red-50/40 dark:border-red-900/60 dark:bg-red-950/20',
      )}
    >
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
              {title}
            </p>
            <p className="text-2xl font-bold tabular-nums text-foreground leading-none">{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-1.5">{sub}</p>}
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

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export default function AdminGastosPage() {
  const { token, isRestoring } = useAuth()
  const [query, setQuery] = useState('')
  const [projectFilter, setProjectFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState<ExpenseStatus | 'all'>('PENDIENTE')

  const q = useQuery({
    queryKey: ['admin-expenses-dashboard', token],
    enabled: Boolean(token) && !isRestoring,
    queryFn: () => fetchExpenseDashboard(token!),
  })

  const projects = q.data?.projects ?? []
  const expenses = q.data?.expenses ?? []

  const filteredExpenses = useMemo(() => {
    const term = query.trim().toLowerCase()
    return expenses.filter((exp) => {
      if (projectFilter !== 'all' && exp.project_id !== projectFilter) return false
      if (statusFilter !== 'all' && exp.status !== statusFilter) return false
      if (!term) return true
      return (
        exp.description.toLowerCase().includes(term) ||
        exp.project_name.toLowerCase().includes(term) ||
        (exp.submitter_name ?? '').toLowerCase().includes(term)
      )
    })
  }, [expenses, projectFilter, query, statusFilter])

  const filteredProjects = useMemo(() => {
    const term = query.trim().toLowerCase()
    if (!term) return projects
    return projects.filter((row) => row.project.name.toLowerCase().includes(term))
  }, [projects, query])

  const totals = useMemo(
    () => ({
      approved: projects.reduce((acc, row) => acc + row.totalApproved, 0),
      pending: projects.reduce((acc, row) => acc + row.pending, 0),
      rejected: projects.reduce((acc, row) => acc + row.rejected, 0),
      expenses: projects.reduce((acc, row) => acc + row.count, 0),
      activeProjects: projects.filter((row) => row.count > 0).length,
    }),
    [projects],
  )

  const hasPending = totals.pending > 0

  return (
    <div className="min-h-screen pb-24">
      <PageHeader
        icon={Receipt}
        title="Gastos"
        subtitle="Vista global: pendientes, métricas y seguimiento por proyecto."
        action={
          hasPending && statusFilter !== 'PENDIENTE' ? (
            <ActionButton intent="view" onClick={() => setStatusFilter('PENDIENTE')}>
              <AlertCircle className="w-3.5 h-3.5" />
              {totals.pending} pendiente{totals.pending !== 1 ? 's' : ''}
            </ActionButton>
          ) : null
        }
      />

      <div className="px-3 py-4 sm:px-4 lg:px-6 lg:py-6 max-w-6xl mx-auto space-y-5">
        {q.isError && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {q.error instanceof ApiError
              ? q.error.message
              : 'No se pudo cargar el módulo de gastos'}
          </div>
        )}

        {q.isLoading && <DashboardSkeleton />}

        {!q.isLoading && (
          <>
            {/* ── Métricas globales ── */}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <MetricCard
                title="Total aprobado"
                value={money(totals.approved)}
                tone="green"
                icon={<TrendingUp className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />}
                sub={`${totals.expenses} gasto${totals.expenses !== 1 ? 's' : ''} en total`}
              />
              <MetricCard
                title="Pendientes"
                value={String(totals.pending)}
                tone={hasPending ? 'warn' : 'default'}
                icon={
                  <Clock
                    className={cn(
                      'h-4 w-4',
                      hasPending
                        ? 'text-amber-700 dark:text-amber-400'
                        : 'text-muted-foreground',
                    )}
                  />
                }
                sub={hasPending ? 'Requieren revisión' : 'Sin pendientes'}
              />
              <MetricCard
                title="Rechazados"
                value={String(totals.rejected)}
                tone={totals.rejected > 0 ? 'red' : 'default'}
                icon={
                  <XCircle
                    className={cn(
                      'h-4 w-4',
                      totals.rejected > 0
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-muted-foreground',
                    )}
                  />
                }
              />
              <MetricCard
                title="Proyectos activos"
                value={`${totals.activeProjects}`}
                tone="default"
                icon={<Building2 className="h-4 w-4 text-primary" />}
                sub={`de ${projects.length} total`}
              />
            </div>

            {/* ── Gastos individuales ── */}
            <Card className="rounded-2xl shadow-sm overflow-hidden">
              <CardHeader className="px-4 sm:px-6 pt-4 sm:pt-5 pb-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div>
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                      <Receipt className="w-4 h-4 text-primary shrink-0" />
                      Gastos operativos
                    </CardTitle>
                    <CardDescription className="mt-0.5 text-xs">
                      Filtrá por proyecto, persona, estado o descripción.
                    </CardDescription>
                  </div>
                  {filteredExpenses.length > 0 && (
                    <span className="text-xs text-muted-foreground tabular-nums bg-muted/40 border rounded-full px-2.5 py-0.5">
                      {filteredExpenses.length} resultado{filteredExpenses.length !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              </CardHeader>

              <CardContent className="space-y-4 px-4 sm:px-6 pb-5">
                {/* Filtros */}
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
                      {projects.map((row) => (
                        <SelectItem key={row.project.id} value={row.project.id}>
                          {row.project.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={statusFilter}
                    onValueChange={(v) => setStatusFilter(v as ExpenseStatus | 'all')}
                  >
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

                {/* Lista de gastos */}
                {filteredExpenses.length > 0 && (
                  <div className="space-y-2">
                    {filteredExpenses.map((exp) => (
                      <div
                        key={exp.id}
                        className={cn(
                          'rounded-xl border-l-[3px] border border-border/70 bg-card overflow-hidden shadow-sm',
                          statusLeftBorder(exp.status),
                        )}
                      >
                        <div className="px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                          {/* Info izquierda */}
                          <div className="min-w-0 flex-1 space-y-1.5">
                            {/* Fila 1: descripción + badges */}
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-sm font-semibold text-foreground leading-tight">
                                {exp.description}
                              </p>
                              <Badge
                                variant="outline"
                                className={cn(
                                  'text-[10px] font-medium px-1.5 py-0 h-4',
                                  projectAvatarColor(exp.project_name),
                                )}
                              >
                                {exp.project_name}
                              </Badge>
                              <ExpenseStatusBadge status={exp.status} />
                            </div>
                            {/* Fila 2: fecha + submitter */}
                            <p className="text-xs text-muted-foreground">
                              {expenseDate(exp.expense_date)}
                              {exp.submitter_name && (
                                <span className="ml-1.5">
                                  · <span className="text-foreground/70">{exp.submitter_name}</span>
                                </span>
                              )}
                            </p>
                          </div>

                          {/* Monto + acción derecha */}
                          <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                            <p className="font-bold text-base tabular-nums text-foreground">
                              {money(parseAmount(exp.amount))}
                            </p>
                            <ActionButton intent="view" asChild size="sm">
                              <Link to={`/app/admin/proyectos/${exp.project_id}/gastos`}>
                                <ExternalLink className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Ver proyecto</span>
                                <span className="sm:hidden">Ver</span>
                              </Link>
                            </ActionButton>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Vacío */}
                {filteredExpenses.length === 0 && (
                  <div className="flex flex-col items-center gap-3 py-12 text-center border border-dashed rounded-xl">
                    <Receipt className="w-10 h-10 text-muted-foreground/25" />
                    <p className="text-sm text-muted-foreground">
                      No hay gastos para los filtros seleccionados.
                    </p>
                    {statusFilter !== 'all' && (
                      <button
                        type="button"
                        onClick={() => setStatusFilter('all')}
                        className="text-xs text-primary hover:underline"
                      >
                        Ver todos los estados
                      </button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* ── Resumen por proyecto ── */}
            <Card className="rounded-2xl shadow-sm overflow-hidden">
              <CardHeader className="px-4 sm:px-6 pt-4 sm:pt-5 pb-3">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-primary shrink-0" />
                  Resumen por proyecto
                </CardTitle>
                <CardDescription className="mt-0.5 text-xs">
                  Proyectos con más pendientes aparecen primero. Hacé clic en "Ver gastos" para
                  gestionar.
                </CardDescription>
              </CardHeader>

              <CardContent className="px-4 sm:px-6 pb-5">
                {filteredProjects.length === 0 && (
                  <div className="flex flex-col items-center gap-2.5 py-10 text-center border border-dashed rounded-xl">
                    <Building2 className="w-9 h-9 text-muted-foreground/25" />
                    <p className="text-sm text-muted-foreground">Sin proyectos para mostrar.</p>
                  </div>
                )}

                <div className="space-y-2">
                  {filteredProjects.map((row) => {
                    const hasPendingHere = row.pending > 0
                    const allApproved = row.approved === row.count && row.count > 0

                    return (
                      <div
                        key={row.project.id}
                        className={cn(
                          'flex flex-wrap sm:flex-nowrap items-center gap-3 rounded-xl border px-4 py-3 transition-colors hover:bg-muted/20',
                          hasPendingHere
                            ? 'border-amber-200/70 dark:border-amber-800/50 bg-amber-50/30 dark:bg-amber-950/10'
                            : 'border-border/70 bg-card',
                        )}
                      >
                        {/* Avatar del proyecto */}
                        <div
                          className={cn(
                            'h-9 w-9 shrink-0 rounded-xl flex items-center justify-center text-sm font-bold select-none',
                            projectAvatarColor(row.project.name),
                          )}
                        >
                          {projectInitial(row.project.name)}
                        </div>

                        {/* Info */}
                        <div className="min-w-0 flex-1 space-y-0.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-semibold text-foreground leading-tight">
                              {row.project.name}
                            </p>
                            {hasPendingHere && (
                              <span className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                                <Clock className="h-2.5 w-2.5" />
                                {row.pending} pendiente{row.pending !== 1 ? 's' : ''}
                              </span>
                            )}
                            {allApproved && (
                              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                                <CheckCircle2 className="h-2.5 w-2.5" />
                                Al día
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {row.count} gasto{row.count !== 1 ? 's' : ''} · Último:{' '}
                            {shortDate(row.lastExpenseDate)}
                          </p>
                        </div>

                        {/* Monto aprobado + acción */}
                        <div className="flex items-center gap-3 shrink-0 ml-auto">
                          <div className="text-right">
                            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                              Aprobado
                            </p>
                            <p className="text-sm font-bold tabular-nums text-foreground">
                              {money(row.totalApproved)}
                            </p>
                          </div>
                          <ActionButton intent="view" asChild size="sm">
                            <Link to={`/app/admin/proyectos/${row.project.id}/gastos`}>
                              Ver gastos
                            </Link>
                          </ActionButton>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  )
}
