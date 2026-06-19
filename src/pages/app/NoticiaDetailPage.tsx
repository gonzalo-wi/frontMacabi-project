import { ArrowLeft, Loader2, Newspaper } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'

import { PageHeader } from '@/components/PageHeader'
import { NewsPreview } from '@/features/news/components/NewsPreview'
import { useNewsDetail } from '@/features/news/hooks/useNewsDetail'
import { formatNewsDate } from '@/features/news/lib/format'
import { useAuth } from '@/hooks/useAuth'
import { ApiError } from '@/lib/api/apiClient'

export default function NoticiaDetailPage() {
  const { id } = useParams()
  const { token } = useAuth()
  const q = useNewsDetail(token, id)

  return (
    <div className="min-h-screen pb-24">
      <PageHeader icon={Newspaper} title="Noticia" />

      <div className="mx-auto max-w-3xl space-y-5 p-4 lg:p-8">
        <Link
          to="/app/noticias"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a noticias
        </Link>

        {q.isPending && (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}
        {q.isError && (
          <p className="text-sm text-destructive">
            {q.error instanceof ApiError ? q.error.message : 'No se pudo cargar la noticia'}
          </p>
        )}
        {q.data && (
          <NewsPreview
            title={q.data.title}
            body={q.data.body}
            imageUrl={q.data.image_url}
            dateLabel={formatNewsDate(q.data.published_at ?? q.data.created_at)}
          />
        )}
      </div>
    </div>
  )
}
