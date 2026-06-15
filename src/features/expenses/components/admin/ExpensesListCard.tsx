import { Receipt, Search } from 'lucide-react'

import { SelectFilter } from '@/components/SelectFilter'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ExpensesList } from '@/features/expenses/components/ExpensesList'
import type { ExpenseDTO, ExpenseStatus } from '@/features/expenses/model/types'
import { EXPENSE_STATUS_FILTER_OPTIONS } from '@/features/expenses/lib/status'

type ProjectOption = { id: string; name: string }

export function ExpensesListCard({
  expenses,
  total,
  isLoading,
  isError,
  error,
  query,
  onQuery,
  projectFilter,
  onProjectFilter,
  statusFilter,
  onStatusFilter,
  projectOptions,
  page,
  totalPages,
  onPageChange,
}: {
  expenses: ExpenseDTO[]
  total: number | undefined
  isLoading: boolean
  isError: boolean
  error: unknown
  query: string
  onQuery: (v: string) => void
  projectFilter: string
  onProjectFilter: (v: string) => void
  statusFilter: ExpenseStatus | 'all'
  onStatusFilter: (v: ExpenseStatus | 'all') => void
  projectOptions: ProjectOption[]
  page: number
  totalPages: number
  onPageChange: (p: number) => void
}) {
  return (
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
          {total != null && (
            <span className="text-xs text-muted-foreground tabular-nums bg-muted/40 border rounded-full px-2.5 py-0.5">
              {total} resultado{total !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4 px-4 sm:px-6 pb-5">
        <div className="grid gap-2 sm:grid-cols-[1fr_180px_160px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              value={query}
              onChange={(e) => onQuery(e.target.value)}
              placeholder="Descripción, proyecto o persona…"
              className="pl-9 h-10 bg-muted/30 border-border/60 focus:bg-background"
            />
          </div>
          <SelectFilter
            value={projectFilter}
            onValueChange={onProjectFilter}
            placeholder="Proyecto"
            triggerClassName="h-10"
            options={[
              { value: 'all', label: 'Todos los proyectos' },
              ...projectOptions.map((p) => ({ value: p.id, label: p.name })),
            ]}
          />
          <SelectFilter
            value={statusFilter}
            onValueChange={(v) => onStatusFilter(v as ExpenseStatus | 'all')}
            placeholder="Estado"
            triggerClassName="h-10"
            options={EXPENSE_STATUS_FILTER_OPTIONS}
          />
        </div>

        <ExpensesList
          expenses={expenses}
          isLoading={isLoading}
          isError={isError}
          error={error}
          detailBasePath="/app/admin/gastos"
          showProject
          page={page}
          totalPages={totalPages}
          onPageChange={onPageChange}
        />
      </CardContent>
    </Card>
  )
}
