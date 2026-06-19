import { useState } from 'react'
import { Newspaper } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { AdminNewsList } from '@/features/news/components/AdminNewsList'
import { NewsFormDialog } from '@/features/news/components/NewsFormDialog'
import { useAdminNewsList } from '@/features/news/hooks/useAdminNewsList'
import { useAuth } from '@/hooks/useAuth'
import { queryKeys } from '@/lib/queryKeys'

export default function AdminNoticiasPage() {
  const { token, isRestoring } = useAuth()
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const q = useAdminNewsList(token, page, !isRestoring)
  const data = q.data

  async function refresh() {
    await Promise.all([
      qc.invalidateQueries({ queryKey: queryKeys.news.adminListRoot() }),
      qc.invalidateQueries({ queryKey: queryKeys.news.feedRoot() }),
      qc.invalidateQueries({ queryKey: queryKeys.news.latestRoot() }),
    ])
  }

  return (
    <div className="min-h-screen pb-24">
      <PageHeader
        icon={Newspaper}
        title="Noticias"
        subtitle="Publicá novedades para todos los miembros."
        action={
          token ? (
            <NewsFormDialog
              token={token}
              onSaved={async () => {
                toast.success('Noticia guardada.')
                await refresh()
              }}
            />
          ) : undefined
        }
      />

      <div className="mx-auto max-w-4xl space-y-4 p-4 lg:p-6">
        <AdminNewsList
          token={token!}
          news={data?.data ?? []}
          isLoading={q.isPending}
          isError={q.isError}
          onChanged={refresh}
        />

        {(data?.total_pages ?? 1) > 1 && (
          <div className="flex items-center justify-center gap-3">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Anterior
            </Button>
            <span className="text-xs text-muted-foreground">
              Página {data?.page ?? page} de {data?.total_pages ?? 1}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= (data?.total_pages ?? 1)}
              onClick={() => setPage((p) => p + 1)}
            >
              Siguiente
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
