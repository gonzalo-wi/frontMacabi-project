import { Link } from 'react-router-dom'
import { Newspaper } from 'lucide-react'

import { Card } from '@/components/ui/card'
import { formatNewsDate } from '../lib/format'
import type { NewsDTO } from '../model/types'

export function NewsCard({ news }: { news: NewsDTO }) {
  return (
    <Link to={`/app/noticias/${news.id}`} className="block group">
      <Card className="overflow-hidden rounded-2xl border-border/65 shadow-premium transition-all duration-200 hover:border-primary/25 hover:scale-[1.01] active:scale-[0.99]">
        {news.image_url ? (
          <div className="aspect-[16/9] w-full overflow-hidden bg-muted/30">
            <img
              src={news.image_url}
              alt={news.title}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            />
          </div>
        ) : (
          <div className="flex aspect-[16/9] w-full items-center justify-center bg-gradient-to-br from-primary/10 via-primary/5 to-transparent">
            <Newspaper className="h-10 w-10 text-primary/40" aria-hidden />
          </div>
        )}
        <div className="space-y-1.5 p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-primary/80">
            {formatNewsDate(news.published_at ?? news.created_at)}
          </p>
          <h3 className="font-extrabold leading-snug tracking-tight text-foreground line-clamp-2 group-hover:text-primary transition-colors">
            {news.title}
          </h3>
          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{news.body}</p>
        </div>
      </Card>
    </Link>
  )
}
