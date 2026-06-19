import { useQuery } from '@tanstack/react-query'

import { queryKeys } from '@/lib/queryKeys'
import { getNews } from '../api/newsApi'

export function useNewsDetail(token: string | null | undefined, id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.news.detail(id, token),
    queryFn: () => getNews(token!, id!),
    enabled: Boolean(token) && Boolean(id),
    staleTime: 30_000,
  })
}
