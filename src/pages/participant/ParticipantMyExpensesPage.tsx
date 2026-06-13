import { useEffect, useMemo, useState } from 'react'
import { CreditCard, Search } from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'

import { toast } from 'sonner'
import { PageHeader } from '@/components/PageHeader'
import { SelectFilter } from '@/components/SelectFilter'
import { SegmentedTabs } from '@/components/SegmentedTabs'
import { ExpenseFormDialog } from '@/features/expenses/components/ExpenseFormDialog'
import { ProjectExpensesPanel } from '@/features/expenses/components/ProjectExpensesPanel'
import { ExpensesList } from '@/features/expenses/components/ExpensesList'
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
import type { ExpenseStatus } from '@/features/expenses/model/types'
import { useMyProjectMemberships } from '@/features/projects/hooks/useMyProjectMemberships'
import { ApiError } from '@/lib/api/apiClient'
import { useAuth } from '@/hooks/useAuth'
import { useSearchParamState } from '@/hooks/useSearchParamState'
import { EXPENSE_STATUS_ORDER, EXPENSE_STATUS_FILTER_OPTIONS } from '@/lib/status'

export default function ParticipantMyExpensesPage() {
  const { token, user, isRestoring } = useAuth()
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [projectFilter, setProjectFilter] = useSearchParamState('project', 'all')
  const [statusRaw, setStatusFilter] = useSearchParamState('estado', 'all')
  const statusFilter = statusRaw as ExpenseStatus | 'all'
  const [query, setQuery] = useSearchParamState('q', '')
  const [tab, setTab] = useSearchParamState('tab', 'mis')
  const [proj, setProj] = useSearchParamState('proj', '')

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
    const order = EXPENSE_STATUS_ORDER
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
                toast.success('Gasto cargado correctamente.')
                await q.refetch()
                // Refresca también el panel "Del proyecto" si el gasto fue para un proyecto visible.
                await qc.invalidateQueries({ queryKey: ['project-expenses'] })
                await qc.invalidateQueries({ queryKey: ['project-expense-summary'] })
              }}
            />
          ) : undefined
        }
      />

      <div className="p-4 lg:p-6 max-w-5xl mx-auto space-y-5">

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
          <SegmentedTabs
            value={activeTab}
            onChange={setTab}
            options={[
              { value: 'mis', label: 'Mis gastos' },
              { value: 'proyecto', label: 'Del proyecto' },
            ]}
          />
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
              <ProjectExpensesPanel token={token} projectId={selectedProj} detailBasePath="/app/gastos" showNewExpenseButton={false} />
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
              <SelectFilter
                value={projectFilter}
                onValueChange={setProjectFilter}
                placeholder="Proyecto"
                triggerClassName="w-full bg-background/50 focus:ring-primary/30"
                options={[
                  { value: 'all', label: 'Todos los proyectos' },
                  ...projectOptions.map((p) => ({ value: p.id, label: p.name })),
                ]}
              />
              <SelectFilter
                value={statusFilter}
                onValueChange={(v) => setStatusFilter(v as ExpenseStatus | 'all')}
                placeholder="Estado"
                triggerClassName="w-full bg-background/50 focus:ring-primary/30"
                options={EXPENSE_STATUS_FILTER_OPTIONS}
              />
            </div>

            <ExpensesList
              expenses={filtered}
              isLoading={q.isPending}
              isError={q.isError}
              error={q.error}
              detailBasePath="/app/gastos"
              showProject
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
