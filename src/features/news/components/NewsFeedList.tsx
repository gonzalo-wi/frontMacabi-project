import { Loader2, Newspaper } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { NewsCard } from './NewsCard'
import type { NewsDTO } from '../model/types'

type Props = {
  news: NewsDTO[]
  isLoading: boolean
  isError: boolean
  page: number
  totalPages: number
  onPageChange: (page: number) => void
}

export function NewsFeedList({ news, isLoading, isError, page, totalPages, onPageChange }: Props) {
  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (isError) {
    return (
      <p className="rounded-xl border border-dashed bg-muted/10 py-10 text-center text-sm text-destructive">
        No se pudieron cargar las noticias.
      </p>
    )
  }

  if (news.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed bg-muted/10 py-14 text-muted-foreground">
        <Newspaper className="h-8 w-8 opacity-30" />
        <p className="text-sm">Todavía no hay noticias publicadas.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        {news.map((n) => (
          <NewsCard key={n.id} news={n} />
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
          >
            Anterior
          </Button>
          <span className="text-xs text-muted-foreground">
            Página {page} de {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
          >
            Siguiente
          </Button>
        </div>
      )}
    </div>
  )
}
