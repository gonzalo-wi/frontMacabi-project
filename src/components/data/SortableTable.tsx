import type { ReactNode } from 'react'
import { ArrowDown, ArrowUp, ArrowUpDown, Loader2 } from 'lucide-react'

import { cn } from '@/lib/utils'

export type SortDirection = 'asc' | 'desc'

export type SortableTableColumn<Row, SortKey extends string> = {
  id: string
  header: ReactNode
  render: (row: Row) => ReactNode
  sortKey?: SortKey
  className?: string
  headerClassName?: string
}

type SortableTableProps<Row, SortKey extends string> = {
  rows: Row[]
  columns: SortableTableColumn<Row, SortKey>[]
  getRowKey: (row: Row) => string
  sortKey?: SortKey
  sortDir?: SortDirection
  onSort?: (key: SortKey) => void
  isLoading?: boolean
  emptyMessage?: ReactNode
  rowClassName?: (row: Row) => string | undefined
}

export function SortableTable<Row, SortKey extends string>({
  rows,
  columns,
  getRowKey,
  sortKey,
  sortDir,
  onSort,
  isLoading,
  emptyMessage = 'No hay resultados.',
  rowClassName,
}: SortableTableProps<Row, SortKey>) {
  if (isLoading) {
    return (
      <div className="flex justify-center rounded-xl border bg-card py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-dashed bg-card p-8 text-center text-sm text-muted-foreground">
        {emptyMessage}
      </div>
    )
  }

  return (
    <div className="hidden overflow-hidden rounded-xl border border-border bg-card md:block">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
            {columns.map((column) => {
              const active = column.sortKey && sortKey === column.sortKey
              const SortIcon = !column.sortKey ? null : active ? (sortDir === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown
              return (
                <th
                  key={column.id}
                  className={cn('px-4 py-3 font-medium', column.headerClassName)}
                >
                  {column.sortKey && onSort ? (
                    <button
                      type="button"
                      className="inline-flex items-center gap-1.5 hover:text-foreground"
                      onClick={() => onSort(column.sortKey!)}
                    >
                      {column.header}
                      {SortIcon && <SortIcon className="h-3.5 w-3.5" />}
                    </button>
                  ) : (
                    column.header
                  )}
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={getRowKey(row)}
              className={cn(
                'border-b border-border/80 transition-colors last:border-0 hover:bg-muted/25',
                rowClassName?.(row),
              )}
            >
              {columns.map((column) => (
                <td key={column.id} className={cn('px-4 py-3 align-top', column.className)}>
                  {column.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
