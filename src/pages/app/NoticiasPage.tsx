import { useState } from 'react'
import { Newspaper } from 'lucide-react'

import { PageHeader } from '@/components/PageHeader'
import { NewsFeedList } from '@/features/news/components/NewsFeedList'
import { useNewsFeed } from '@/features/news/hooks/useNewsFeed'
import { useAuth } from '@/hooks/useAuth'

export default function NoticiasPage() {
  const { token, isRestoring } = useAuth()
  const [page, setPage] = useState(1)
  const q = useNewsFeed(token, page, !isRestoring)
  const data = q.data

  return (
    <div className="min-h-screen pb-24">
      <PageHeader icon={Newspaper} title="Noticias" subtitle="Las novedades de Macabi, al día." />

      <div className="mx-auto max-w-5xl p-4 lg:p-6">
        <NewsFeedList
          news={data?.data ?? []}
          isLoading={q.isPending}
          isError={q.isError}
          page={data?.page ?? page}
          totalPages={data?.total_pages ?? 1}
          onPageChange={setPage}
        />
      </div>
    </div>
  )
}
