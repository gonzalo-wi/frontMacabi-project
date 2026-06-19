import { useState } from 'react'
import { Loader2, Newspaper, Pencil, Trash2 } from 'lucide-react'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { ApiError } from '@/lib/api/apiClient'
import { cn } from '@/lib/utils'
import { NewsFormDialog } from './NewsFormDialog'
import { deleteNews } from '../api/newsApi'
import { formatNewsDate } from '../lib/format'
import type { NewsDTO } from '../model/types'

type Props = {
  token: string
  news: NewsDTO[]
  isLoading: boolean
  isError: boolean
  onChanged: () => void | Promise<void>
}

export function AdminNewsList({ token, news, isLoading, isError, onChanged }: Props) {
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
        <p className="text-sm">Todavía no creaste ninguna noticia.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {news.map((n) => (
        <AdminNewsRow key={n.id} token={token} news={n} onChanged={onChanged} />
      ))}
    </div>
  )
}

function AdminNewsRow({
  token,
  news,
  onChanged,
}: {
  token: string
  news: NewsDTO
  onChanged: () => void | Promise<void>
}) {
  const [confirmOpen, setConfirmOpen] = useState(false)
  const isPublished = news.status === 'published'

  const delM = useMutation({
    mutationFn: () => deleteNews(token, news.id),
    onSuccess: async () => {
      setConfirmOpen(false)
      toast.success('Noticia eliminada')
      await onChanged()
    },
    onError: (e) => {
      toast.error(e instanceof ApiError ? e.message : 'No se pudo eliminar la noticia')
    },
  })

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border/65 bg-card p-3 shadow-sm">
      <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-muted/30">
        {news.image_url ? (
          <img src={news.image_url} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-primary/5">
            <Newspaper className="h-5 w-5 text-primary/40" aria-hidden />
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <Badge
            variant="secondary"
            className={cn(
              'text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border-transparent',
              isPublished
                ? 'bg-emerald-500/12 text-emerald-600 dark:text-emerald-400'
                : 'bg-amber-500/12 text-amber-600 dark:text-amber-400',
            )}
          >
            {isPublished ? 'Publicada' : 'Borrador'}
          </Badge>
          <span className="text-[11px] text-muted-foreground">
            {formatNewsDate(news.published_at ?? news.created_at)}
          </span>
          <span aria-hidden className="text-[11px] text-border">·</span>
          <span className="text-[11px] text-muted-foreground">
            {news.project_ids.length === 0
              ? 'Todos los proyectos'
              : `${news.project_ids.length} proyecto${news.project_ids.length === 1 ? '' : 's'}`}
          </span>
        </div>
        <h3 className="mt-0.5 truncate font-bold text-sm text-foreground">{news.title}</h3>
        <p className="truncate text-xs text-muted-foreground">{news.body}</p>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <NewsFormDialog
          token={token}
          news={news}
          onSaved={onChanged}
          trigger={
            <Button type="button" size="icon" variant="ghost" className="h-9 w-9" aria-label="Editar noticia">
              <Pencil className="w-4 h-4" />
            </Button>
          }
        />
        <ConfirmDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          trigger={
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-9 w-9 text-destructive hover:text-destructive"
              aria-label="Eliminar noticia"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          }
          title="¿Eliminar esta noticia?"
          description="Se borrará la noticia, su imagen y las notificaciones asociadas. Esta acción no se puede deshacer."
          confirmLabel="Eliminar"
          destructive
          loading={delM.isPending}
          onConfirm={() => delM.mutate()}
        />
      </div>
    </div>
  )
}
