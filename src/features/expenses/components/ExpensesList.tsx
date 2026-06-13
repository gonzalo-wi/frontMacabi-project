import { Link } from 'react-router-dom'
import { ChevronRight, Paperclip, Receipt, Tag } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { PaginationControls } from '@/components/data/PaginationControls'
import { ExpenseStatusBadge } from '@/features/expenses/components/ExpenseStatusBadge'
import {
  expenseStatusBorderClass,
  formatExpenseDateShort,
  projectAvatarColor,
} from '@/features/expenses/lib/expenseHelpers'
import type { ExpenseDTO } from '@/features/expenses/model/types'
import { ApiError } from '@/lib/api/apiClient'
import { formatARS } from '@/lib/currency'
import { cn } from '@/lib/utils'

/**
 * Lista de gastos compartida por todas las vistas (admin global, proyecto, mis gastos).
 * Es read-only: cada fila navega al detalle, donde se aprueba/rechaza/edita según permiso.
 * Los filtros/encabezados los pone cada página; este componente solo pinta filas + estados + paginado.
 */
export function ExpensesList({
  expenses,
  isLoading,
  isError,
  error,
  detailBasePath,
  showProject = false,
  emptyMessage = 'No hay gastos para los filtros seleccionados.',
  page,
  totalPages,
  onPageChange,
}: {
  expenses: ExpenseDTO[]
  isLoading: boolean
  isError: boolean
  error?: unknown
  /** Base del link al detalle, p. ej. '/app/gastos' o '/app/admin/gastos'. */
  detailBasePath: string
  /** Mostrar el badge de proyecto (vistas globales / mis gastos). */
  showProject?: boolean
  emptyMessage?: string
  page: number
  totalPages: number
  onPageChange: (p: number) => void
}) {
  return (
    <div className="space-y-2">
      {isError && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error instanceof ApiError ? error.message : 'No se pudieron cargar los gastos'}
        </div>
      )}

      {isLoading && (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-16 rounded-xl bg-muted/40 animate-pulse"
              style={{ opacity: 1 - i * 0.25 }}
            />
          ))}
        </div>
      )}

      {!isLoading && !isError && expenses.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-12 text-center border border-dashed rounded-xl">
          <Receipt className="w-10 h-10 text-muted-foreground/25" />
          <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        </div>
      )}

      {!isLoading &&
        expenses.map((exp) => (
          <Link
            key={exp.id}
            to={`${detailBasePath}/${exp.id}`}
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
                  {showProject && exp.project_name && (
                    <Badge
                      variant="outline"
                      className={cn(
                        'text-[10px] font-medium px-1.5 py-0 h-4',
                        projectAvatarColor(exp.project_name),
                      )}
                    >
                      {exp.project_name}
                    </Badge>
                  )}
                  {exp.category_name && (
                    <Badge
                      variant="outline"
                      className="text-[10px] font-medium px-1.5 py-0 h-4 gap-0.5 text-violet-700 bg-violet-50 border-violet-200 dark:bg-violet-950/30 dark:text-violet-300 dark:border-violet-800/60"
                    >
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
                  {exp.receipt_storage_path && (
                    <span className="ml-1.5 inline-flex items-center gap-1">
                      · <Paperclip className="w-3 h-3" />
                      Comprobante
                    </span>
                  )}
                </p>
                {exp.rejection_reason && (
                  <p className="text-xs text-destructive font-medium">
                    Motivo: {exp.rejection_reason}
                  </p>
                )}
              </div>
              <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                <p className="font-bold text-base tabular-nums text-foreground">
                  {formatARS(exp.amount)}
                </p>
                <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
              </div>
            </div>
          </Link>
        ))}

      <PaginationControls page={page} totalPages={totalPages} onPageChange={onPageChange} />
    </div>
  )
}
