import { useMemo } from 'react'
import { CreditCard, Search } from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'

import { toast } from 'sonner'
import { PageHeader } from '@/components/PageHeader'
import { SelectFilter } from '@/components/SelectFilter'
import { ExpenseFormDialog } from '@/features/expenses/components/ExpenseFormDialog'
import { ProjectExpensesPanel } from '@/features/expenses/components/ProjectExpensesPanel'
import { ExpensesList } from '@/features/expenses/components/ExpensesList'
import { ProjectScopeTabs } from '@/features/projects/components/ProjectScopeTabs'
import { useProjectScope } from '@/features/projects/hooks/useProjectScope'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { listMyExpenses } from '@/features/expenses/api/expensesApi'
import type { ExpenseStatus } from '@/features/expenses/model/types'
import { ApiError } from '@/lib/api/apiClient'
import { fetchAllPages } from '@/lib/api/fetchAllPages'
import { useAuth } from '@/hooks/useAuth'
import { useClientPagination } from '@/hooks/useClientPagination'
import { useSearchParamState } from '@/hooks/useSearchParamState'
import { EXPENSE_STATUS_ORDER, EXPENSE_STATUS_FILTER_OPTIONS } from '@/lib/status'

export default function MisGastosPage() {
  const { token, user, isRestoring } = useAuth()
  const qc = useQueryClient()
  const [projectFilter, setProjectFilter] = useSearchParamState('project', 'all')
  const [statusRaw, setStatusFilter] = useSearchParamState('estado', 'all')
  const statusFilter = statusRaw as ExpenseStatus | 'all'
  const [query, setQuery] = useSearchParamState('q', '')

  const scope = useProjectScope(token, user?.id, isRestoring)

  const q = useQuery({
    queryKey: ['my-expenses-global', token],
    queryFn: () => fetchAllPages((p) => listMyExpenses(token!, p, 50)),
    enabled: Boolean(token) && !isRestoring,
  })

  const sorted = useMemo(() => {
    const order = EXPENSE_STATUS_ORDER
    return [...(q.data ?? [])].sort((a, b) => {
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

  const { page, setPage, totalPages, pageItems } = useClientPagination(filtered, {
    resetKey: `${projectFilter}|${statusFilter}|${query}`,
  })

  const misContent = (
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
              ...scope.projectOptions.map((p) => ({ value: p.id, label: p.name })),
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
          expenses={pageItems}
          isLoading={q.isPending}
          isError={q.isError}
          error={q.error}
          detailBasePath="/app/gastos"
          showProject
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
        />
      </CardContent>
    </Card>
  )

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
              projectOptions={scope.projectOptions}
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
        {scope.membershipsQ.isError && (
          <p className="text-sm text-destructive">
            {scope.membershipsQ.error instanceof ApiError
              ? scope.membershipsQ.error.message
              : 'No se pudieron cargar tus proyectos'}
          </p>
        )}

        <ProjectScopeTabs
          misLabel="Mis gastos"
          coordinated={scope.coordinated}
          hasCoordinated={scope.hasCoordinated}
          activeTab={scope.activeTab}
          onTabChange={scope.setTab}
          selectedProjectId={scope.selectedProjectId}
          onProjectChange={scope.setProj}
          misContent={misContent}
          projectPanel={
            <ProjectExpensesPanel
              token={token!}
              projectId={scope.selectedProjectId}
              detailBasePath="/app/gastos"
              showNewExpenseButton={false}
            />
          }
        />
      </div>
    </div>
  )
}
