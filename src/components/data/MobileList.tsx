import type { ReactNode } from 'react'
import { Loader2 } from 'lucide-react'

type MobileListProps<Row> = {
  rows: Row[]
  getRowKey: (row: Row) => string
  renderRow: (row: Row) => ReactNode
  isLoading?: boolean
  emptyMessage?: ReactNode
}

export function MobileList<Row>({
  rows,
  getRowKey,
  renderRow,
  isLoading,
  emptyMessage = 'No hay resultados.',
}: MobileListProps<Row>) {
  if (isLoading) {
    return (
      <div className="flex justify-center rounded-xl border bg-card py-12 md:hidden">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-dashed bg-card p-8 text-center text-sm text-muted-foreground md:hidden">
        {emptyMessage}
      </div>
    )
  }

  return (
    <div className="space-y-3 md:hidden">
      {rows.map((row) => (
        <div key={getRowKey(row)} className="rounded-xl border bg-card p-4">
          {renderRow(row)}
        </div>
      ))}
    </div>
  )
}
