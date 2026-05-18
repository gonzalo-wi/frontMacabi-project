import { Link } from 'react-router-dom'
import { Loader2, Receipt, Search } from 'lucide-react'
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

type ProjectExpenseStats = {
  project: ProjectDTO
  totalApproved: number
  count: number
  pending: number
  approved: number
  rejected: number
  lastExpenseDate: string | null
}

type AdminExpenseRow = ExpenseDTO & {
  project_name: string
}

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

      const counts: Record<ExpenseStatus, number> = {
        PENDIENTE: 0,
        APROBADO: 0,
        RECHAZADO: 0,
      }
      for (const exp of expenses) counts[exp.status]++

      const lastExpenseDate =
        expenses
          .map((exp) => exp.expense_date)
          .sort()
          .at(-1) ?? null

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
        expenses: expenses.map((exp): AdminExpenseRow => ({
          ...exp,
          project_name: project.name,
        })),
      }
    }),
  )

  return {
    projects: rows
      .map((row) => row.stats)
      .sort((a, b) => {
        if (b.pending !== a.pending) return b.pending - a.pending
        if (b.totalApproved !== a.totalApproved) return b.totalApproved - a.totalApproved
        return a.project.name.localeCompare(b.project.name)
      }),
    expenses: rows
      .flatMap((row) => row.expenses)
      .sort((a, b) => {
        const order: Record<ExpenseStatus, number> = {
          PENDIENTE: 0,
          APROBADO: 1,
          RECHAZADO: 2,
        }
        const byStatus = order[a.status] - order[b.status]
        if (byStatus !== 0) return byStatus
        return new Date(b.expense_date).getTime() - new Date(a.expense_date).getTime()
      }),
  }
}

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

  return (
    <div className="min-h-screen pb-24">
      <PageHeader
        icon={Receipt}
        title="Gastos"
        subtitle="Módulo global: pendientes, métricas y seguimiento por proyecto."
        action={
          totals.pending > 0 && statusFilter !== 'PENDIENTE' ? (
            <ActionButton intent="view" onClick={() => setStatusFilter('PENDIENTE')}>
              Ver pendientes
            </ActionButton>
          ) : null
        }
      />

      <div className="p-4 lg:p-6 max-w-6xl mx-auto space-y-5">
        {q.isError && (
          <p className="text-sm text-destructive">
            {q.error instanceof ApiError ? q.error.message : 'No se pudo cargar el módulo de gastos'}
          </p>
        )}

        {q.isLoading && (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {!q.isLoading && (
          <>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <MetricCard title="Total aprobado" value={money(totals.approved)} />
              <MetricCard title="Pendientes" value={String(totals.pending)} tone={totals.pending > 0 ? 'warn' : 'default'} />
              <MetricCard title="Rechazados" value={String(totals.rejected)} />
              <MetricCard title="Proyectos con gastos" value={`${totals.activeProjects}/${projects.length}`} />
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Gastos operativos</CardTitle>
                <CardDescription>
                  Revisá pendientes primero o filtrá por proyecto, persona, estado o descripción.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2 md:grid-cols-[1fr_200px_180px]">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                    <Input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Buscar descripción, proyecto o persona"
                      className="pl-9"
                    />
                  </div>
                  <Select value={projectFilter} onValueChange={setProjectFilter}>
                    <SelectTrigger className="w-full">
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
                  <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as ExpenseStatus | 'all')}>
                    <SelectTrigger className="w-full">
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

                {filteredExpenses.length > 0 && (
                  <div className="rounded-xl border overflow-hidden">
                    <div className="divide-y">
                      {filteredExpenses.map((exp) => (
                        <div key={exp.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                          <div className="min-w-0 space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-medium text-sm">{exp.description}</p>
                              <Badge variant="outline">{exp.project_name}</Badge>
                              <ExpenseStatusBadge status={exp.status} />
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {expenseDate(exp.expense_date)}
                              {exp.submitter_name ? ` · ${exp.submitter_name}` : ''}
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <p className="font-semibold tabular-nums">{money(parseAmount(exp.amount))}</p>
                            <ActionButton intent="view" asChild>
                              <Link to={`/app/admin/proyectos/${exp.project_id}/gastos`}>
                                Ver proyecto
                              </Link>
                            </ActionButton>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {filteredExpenses.length === 0 && (
                  <div className="rounded-xl border border-dashed p-8 text-center">
                    <p className="text-sm text-muted-foreground">
                      No hay gastos para los filtros seleccionados.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Resumen por proyecto</CardTitle>
                <CardDescription>Vista rápida para detectar proyectos con pendientes o mayor monto aprobado.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {filteredProjects.map((row) => (
                  <div
                    key={row.project.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3"
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-sm">{row.project.name}</p>
                        {row.pending > 0 && (
                          <Badge variant="secondary">{row.pending} pendiente{row.pending === 1 ? '' : 's'}</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {row.count} gasto{row.count === 1 ? '' : 's'} · Último: {shortDate(row.lastExpenseDate)}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center justify-end gap-3">
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Aprobado</p>
                        <p className="font-semibold tabular-nums">{money(row.totalApproved)}</p>
                      </div>
                      <ActionButton intent="view" asChild>
                        <Link to={`/app/admin/proyectos/${row.project.id}/gastos`}>
                          Ver gastos
                        </Link>
                      </ActionButton>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  )
}

function MetricCard({
  title,
  value,
  tone = 'default',
}: {
  title: string
  value: string
  tone?: 'default' | 'warn'
}) {
  return (
    <Card className={tone === 'warn' ? 'border-amber-300 bg-amber-50/50 dark:bg-amber-950/10' : ''}>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{title}</p>
        <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
      </CardContent>
    </Card>
  )
}
