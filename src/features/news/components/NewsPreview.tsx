import { cn } from '@/lib/utils'

type Props = {
  title: string
  body: string
  imageUrl?: string | null
  dateLabel?: string
  className?: string
}

/**
 * Render canónico de una noticia: imagen + título + cuerpo.
 * Reutilizado por el detalle y por la previsualización del admin antes de publicar.
 */
export function NewsPreview({ title, body, imageUrl, dateLabel, className }: Props) {
  return (
    <article className={cn('space-y-4', className)}>
      {imageUrl && (
        <div className="overflow-hidden rounded-2xl border border-border/60 bg-muted/30">
          <img
            src={imageUrl}
            alt={title || 'Imagen de la noticia'}
            className="w-full max-h-[420px] object-cover"
          />
        </div>
      )}
      <div className="space-y-1.5">
        {dateLabel && (
          <p className="text-[11px] font-bold uppercase tracking-wider text-primary/80">{dateLabel}</p>
        )}
        <h1 className="text-xl lg:text-2xl font-extrabold tracking-tight text-foreground break-words">
          {title || 'Sin título'}
        </h1>
      </div>
      <div className="whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground/90">
        {body || 'Sin contenido.'}
      </div>
    </article>
  )
}
