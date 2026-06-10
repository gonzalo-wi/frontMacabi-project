import { Link } from 'react-router-dom'
import { ExternalLink, Receipt, Search, Tag } from 'lucide-react'

import { SelectFilter } from '@/components/SelectFilter'
import { PaginationControls } from '@/components/data/PaginationControls'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ExpenseStatusBadge } from '@/features/expenses/components/ExpenseStatusBadge'
import {
  expenseStatusBorderClass,
  formatExpenseDateShort,
  projectAvatarColor,
} from '@/features/expenses/lib/expenseHelpers'
import type { ExpenseDTO, ExpenseStatus } from '@/features/expenses/model/types'
import { ApiError } from '@/lib/api/apiClient'
import { formatARS } from '@/lib/currency'
import { EXPENSE_STATUS_FILTER_OPTIONS } from '@/lib/status'
import { cn } from '@/lib/utils'

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

        {isError && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {error instanceof ApiError ? error.message : 'No se pudieron cargar los gastos'}
          </div>
        )}

        {isLoading && (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-16 rounded-xl bg-muted/40 animate-pulse" style={{ opacity: 1 - i * 0.25 }} />
            ))}
          </div>
        )}

        {!isLoading && expenses.length > 0 && (
          <div className="space-y-2">
            {expenses.map((exp) => (
              <Link
                key={exp.id}
                to={`/app/admin/gastos/${exp.id}`}
                className={cn(
                  'block rounded-xl border-l-[3px] border border-border/70 bg-card overflow-hidden shadow-sm transition-colors hover:bg-muted/20',
                  expenseStatusBorderClass(exp.status),
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
                      {formatExpenseDateShort(exp.expense_date)}
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

        {!isLoading && expenses.length === 0 && !isError && (
          <div className="flex flex-col items-center gap-3 py-12 text-center border border-dashed rounded-xl">
            <Receipt className="w-10 h-10 text-muted-foreground/25" />
            <p className="text-sm text-muted-foreground">
              No hay gastos para los filtros seleccionados.
            </p>
          </div>
        )}

        <PaginationControls page={page} totalPages={totalPages} onPageChange={onPageChange} />
      </CardContent>
    </Card>
  )
}
