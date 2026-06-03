import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CreditCard, Loader2, Search, Calendar, Paperclip, DollarSign } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'

import { FeedbackBanner } from '@/components/FeedbackBanner'
import { PageHeader } from '@/components/PageHeader'
import { PaginationControls } from '@/components/admin/PaginationControls'
import { ExpenseStatusBadge } from '@/components/StatusBadge'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { listMyExpenses } from '@/features/expenses/api/expensesApi'
import { ExpenseFormDialog } from '@/features/expenses/components/ExpenseFormDialog'
import { ProjectExpensesPanel } from '@/features/expenses/components/ProjectExpensesPanel'
import type { ExpenseDTO, ExpenseStatus } from '@/features/expenses/model/types'
import { useMyProjectMemberships } from '@/features/projects/hooks/useMyProjectMemberships'
import { ApiError } from '@/lib/api/apiClient'
import { formatARS } from '@/lib/currency'
import { useAuth } from '@/hooks/useAuth'
import { useSearchParamState } from '@/hooks/useSearchParamState'
import { cn } from '@/lib/utils'

export default function ParticipantMyExpensesPage() {
  const { token, user, isRestoring } = useAuth()
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const [projectFilter, setProjectFilter] = useSearchParamState('project', 'all')
  const [statusRaw, setStatusFilter] = useSearchParamState('estado', 'all')
  const statusFilter = statusRaw as ExpenseStatus | 'all'
  const [query, setQuery] = useSearchParamState('q', '')
  const [tab, setTab] = useSearchParamState('tab', 'mis')
  const [proj, setProj] = useSearchParamState('proj', '')
  const [feedback, setFeedback] = useState<{
    text: string
    variant: 'success' | 'error' | 'info'
  } | null>(null)

  useEffect(() => {
    if (!feedback) return
    const timer = setTimeout(() => setFeedback(null), 4000)
    return () => clearTimeout(timer)
  }, [feedback])

  const q = useQuery({
    queryKey: ['my-expenses-global', token, page],
    queryFn: () => listMyExpenses(token!, page, 20),
    enabled: Boolean(token) && !isRestoring,
  })

  const membershipsQ = useMyProjectMemberships(token, user?.id, isRestoring)
  const projectOptions = membershipsQ.data ?? []
  const coordinated = projectOptions.filter((p) => p.role === 'coordinator')
  const hasCoordinated = coordinated.length > 0
  const activeTab = hasCoordinated ? tab : 'mis'
  const selectedProj = proj || coordinated[0]?.id || ''

  useEffect(() => {
    setPage(1)
  }, [query, statusFilter, projectFilter])

  const sorted = useMemo(() => {
    const order: Record<ExpenseStatus, number> = {
      PENDIENTE: 0,
      APROBADO: 1,
      RECHAZADO: 2,
    }
    return [...(q.data?.data ?? [])].sort((a, b) => {
      const byStatus = order[a.status] - order[b.status]
      if (byStatus !== 0) return byStatus
      return new Date(b.expense_date).getTime() - new Date(a.expense_date).getTime()
    })
  }, [q.data])

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase()
    return sorted.filter((e) => {
      if (projectFilter !== 'all' && e.project_id !== projectFilter) return false
      if (statusFilter !== 'all' && e.status !== statusFilter) return false
      if (!term) return true
      return (
        e.description.toLowerCase().includes(term) ||
        (e.project_name ?? '').toLowerCase().includes(term)
      )
    })
  }, [projectFilter, query, sorted, statusFilter])

  return (
    <div className="min-h-screen pb-24">
      <PageHeader
        icon={CreditCard}
        title="Gastos"
        subtitle="Todos tus gastos en un solo lugar, siempre asociados a un proyecto."
        action={
          token ? (
            <ExpenseFormDialog
              token={token}
              projectOptions={projectOptions}
              onCreated={async () => {
                setFeedback({ text: 'Gasto cargado correctamente.', variant: 'success' })
                await q.refetch()
              }}
            />
          ) : undefined
        }
      />

      <div className="p-4 lg:p-6 max-w-5xl mx-auto space-y-5">
        {feedback && <FeedbackBanner message={feedback.text} variant={feedback.variant} />}

        {q.isError && (
          <p className="text-sm text-destructive">
            {q.error instanceof ApiError ? q.error.message : 'No se pudieron cargar tus gastos'}
          </p>
        )}

        {membershipsQ.isError && (
          <p className="text-sm text-destructive">
            {membershipsQ.error instanceof ApiError
              ? membershipsQ.error.message
              : 'No se pudieron cargar tus proyectos'}
          </p>
        )}

        {/* ── Solapas (solo si coordina algún proyecto) ── */}
        {hasCoordinated && (
          <div className="inline-flex rounded-xl border border-border/70 bg-muted/30 p-1">
            <button
              type="button"
              onClick={() => setTab('mis')}
              className={cn(
                'rounded-lg px-3.5 py-1.5 text-sm font-semibold transition-colors',
                activeTab === 'mis' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              Mis gastos
            </button>
            <button
              type="button"
              onClick={() => setTab('proyecto')}
              className={cn(
                'rounded-lg px-3.5 py-1.5 text-sm font-semibold transition-colors',
                activeTab === 'proyecto' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              Del proyecto
            </button>
          </div>
        )}

        {/* ── Solapa "Del proyecto": selector + panel completo ── */}
        {activeTab === 'proyecto' && hasCoordinated && token && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-muted-foreground">Proyecto</span>
              <Select value={selectedProj} onValueChange={setProj}>
                <SelectTrigger className="h-9 w-[240px]">
                  <SelectValue placeholder="Elegí un proyecto" />
                </SelectTrigger>
                <SelectContent>
                  {coordinated.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedProj && (
              <ProjectExpensesPanel token={token} projectId={selectedProj} detailBasePath="/app/gastos" />
            )}
          </div>
        )}

        {/* ── Solapa "Mis gastos" (o usuario sin proyectos a coordinar) ── */}
        {activeTab === 'mis' && (
        <Card className="border border-border/50 bg-card/60 backdrop-blur-md shadow-premium rounded-2xl overflow-hidden">
          <CardHeader className="pb-3 border-b border-border/40">
            <CardTitle className="text-base font-extrabold tracking-tight">Mis gastos</CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Tocá un gasto para ver el detalle, su estado y las acciones disponibles.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5 pt-5">
            <div className="grid gap-2.5 md:grid-cols-[1fr_180px_180px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar por descripción o proyecto..."
                  className="pl-9 bg-background/50 focus-visible:ring-primary/30"
                />
              </div>
              <Select value={projectFilter} onValueChange={setProjectFilter}>
                <SelectTrigger className="w-full bg-background/50 focus:ring-primary/30">
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
                <SelectTrigger className="w-full bg-background/50 focus:ring-primary/30">
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

            {q.isPending && (
              <div className="flex justify-center py-16">
                <Loader2 className="h-7 w-7 animate-spin text-primary" />
              </div>
            )}

            {!q.isPending && filtered.length > 0 && (
              <div className="space-y-3.5">
                {filtered.map((e: ExpenseDTO) => {
                  const borderCls =
                    e.status === 'APROBADO'
                      ? 'border-l-emerald-500/80 dark:border-l-emerald-500'
                      : e.status === 'RECHAZADO'
                        ? 'border-l-red-500/80 dark:border-l-red-500'
                        : 'border-l-amber-500/80 dark:border-l-amber-500'

                  return (
                    <button
                      key={e.id}
                      type="button"
                      onClick={() => navigate(`/app/gastos/${e.id}`)}
                      className={cn(
                        'w-full text-left flex flex-col gap-3.5 rounded-2xl border border-border/60 bg-card/30 backdrop-blur-xs p-4 sm:p-5 shadow-sm transition-all duration-200 hover:scale-[1.01] hover:shadow-md hover:border-primary/20 border-l-[5px] cursor-pointer',
                        borderCls,
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1.5 min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="font-extrabold text-sm text-foreground tracking-tight leading-snug break-words">
                              {e.description}
                            </h4>
                            <Badge variant="secondary" className="text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-full bg-secondary/60 border-border/40 text-secondary-foreground">
                              {e.project_name?.trim() || 'Proyecto'}
                            </Badge>
                          </div>

                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-muted-foreground/75" />
                              {new Date(`${e.expense_date}T12:00:00`).toLocaleDateString('es-AR', {
                                day: '2-digit',
                                month: '2-digit',
                                year: '2-digit',
                              })}
                            </span>
                            {e.receipt_storage_path && (
                              <span className="flex items-center gap-1.5 text-muted-foreground">
                                <Paperclip className="w-3.5 h-3.5 text-muted-foreground/75" />
                                Comprobante
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="shrink-0">
                          <ExpenseStatusBadge status={e.status} className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5" />
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 pt-3 border-t border-border/40 mt-1">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <DollarSign className="w-4 h-4" />
                        </div>
                        <span className="text-base font-extrabold tabular-nums text-foreground tracking-tight">
                          {formatARS(e.amount)}
                        </span>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}

            {!q.isPending && filtered.length === 0 && !q.isError && (
              <div className="rounded-2xl border border-dashed border-border/80 p-10 text-center">
                <p className="text-xs text-muted-foreground max-w-xs mx-auto leading-relaxed">
                  No hay gastos para los filtros seleccionados.
                </p>
              </div>
            )}

            <PaginationControls
              page={page}
              totalPages={q.data?.total_pages ?? 1}
              onPageChange={setPage}
            />
          </CardContent>
        </Card>
        )}
      </div>
    </div>
  )
}
