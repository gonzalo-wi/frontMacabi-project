import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'
import { getPageRange } from '@/lib/pagination'

type PaginationControlsProps = {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
  /** Modo condensado (mobile): solo Anterior/Siguiente + contador, sin números. */
  compact?: boolean
}

export function PaginationControls({
  page,
  totalPages,
  onPageChange,
  compact = false,
}: PaginationControlsProps) {
  if (totalPages <= 1) return null

  const go = (p: number) => onPageChange(Math.min(totalPages, Math.max(1, p)))

  return (
    <Pagination className="pt-2">
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious disabled={page <= 1} onClick={() => go(page - 1)} />
        </PaginationItem>

        {compact ? (
          <PaginationItem>
            <span className="px-2 text-sm text-muted-foreground tabular-nums">
              {page} / {totalPages}
            </span>
          </PaginationItem>
        ) : (
          getPageRange(page, totalPages).map((p, i) =>
            p === 'ellipsis' ? (
              <PaginationItem key={`ellipsis-${i}`}>
                <PaginationEllipsis />
              </PaginationItem>
            ) : (
              <PaginationItem key={p}>
                <PaginationLink isActive={p === page} onClick={() => go(p)}>
                  {p}
                </PaginationLink>
              </PaginationItem>
            ),
          )
        )}

        <PaginationItem>
          <PaginationNext disabled={page >= totalPages} onClick={() => go(page + 1)} />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  )
}
