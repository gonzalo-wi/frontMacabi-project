import { ChevronLeft, ChevronRight } from 'lucide-react'

import { ActionButton, ActionIconButton } from '@/components/ActionButton'

type PaginationControlsProps = {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
  compact?: boolean
}

export function PaginationControls({
  page,
  totalPages,
  onPageChange,
  compact = false,
}: PaginationControlsProps) {
  if (totalPages <= 1) return null

  return (
    <div className="flex items-center justify-center gap-3 pt-2">
      {compact ? (
        <ActionIconButton
          type="button"
          intent="secondary"
          label="Página anterior"
          disabled={page <= 1}
          onClick={() => onPageChange(Math.max(1, page - 1))}
        >
          <ChevronLeft className="h-4 w-4" />
        </ActionIconButton>
      ) : (
        <ActionButton
          intent="secondary"
          disabled={page <= 1}
          onClick={() => onPageChange(Math.max(1, page - 1))}
        >
          Anterior
        </ActionButton>
      )}
      <span className="text-sm text-muted-foreground">
        {page} / {totalPages}
      </span>
      {compact ? (
        <ActionIconButton
          type="button"
          intent="secondary"
          label="Página siguiente"
          disabled={page >= totalPages}
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
        >
          <ChevronRight className="h-4 w-4" />
        </ActionIconButton>
      ) : (
        <ActionButton
          intent="secondary"
          disabled={page >= totalPages}
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
        >
          Siguiente
        </ActionButton>
      )}
    </div>
  )
}
