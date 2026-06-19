import { Link } from 'react-router-dom'
import { Newspaper, ArrowRight } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { useLatestNews } from '../hooks/useLatestNews'
import { formatNewsDate } from '../lib/format'

type Props = {
  token: string
  className?: string
}

/** Bloque del Panel con la última noticia publicada. No renderiza nada si aún no hay ninguna. */
export function LatestNewsBlock({ token, className }: Props) {
  const { data, isPending } = useLatestNews(token)

  // Sin noticia publicada (o cargando la primera vez): no ocupamos espacio en el panel.
  if (!isPending && !data) return null

  return (
    <Card className={cn('shadow-premium border-border/65 rounded-2xl overflow-hidden', className)}>
      <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 pb-4">
        <div className="flex items-center gap-3.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Newspaper className="h-5 w-5" aria-hidden />
          </div>
          <div className="min-w-0 space-y-0.5">
            <CardTitle className="text-base font-extrabold tracking-tight">Última noticia</CardTitle>
            <CardDescription className="text-xs leading-none">Lo más reciente de Macabi.</CardDescription>
          </div>
        </div>
        <Link
          to="/app/noticias"
          className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline shrink-0"
        >
          Ver todas
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </CardHeader>
      <CardContent className="pt-0">
        {isPending || !data ? (
          <div className="h-24 animate-pulse rounded-xl bg-muted/40" />
        ) : (
          <Link
            to={`/app/noticias/${data.id}`}
            className="group block overflow-hidden rounded-xl border border-border/70 bg-card transition-all duration-200 hover:border-primary/25"
          >
            {data.image_url && (
              <div className="aspect-[16/9] w-full overflow-hidden bg-muted/30 sm:aspect-[21/9]">
                <img
                  src={data.image_url}
                  alt={data.title}
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                />
              </div>
            )}
            <div className="space-y-1.5 p-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-primary/80">
                {formatNewsDate(data.published_at ?? data.created_at)}
              </p>
              <h3 className="font-extrabold leading-snug tracking-tight text-foreground line-clamp-2 group-hover:text-primary transition-colors">
                {data.title}
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">{data.body}</p>
            </div>
          </Link>
        )}
      </CardContent>
    </Card>
  )
}
