import { useQuery } from '@tanstack/react-query'

import { queryKeys } from '@/lib/queryKeys'
import { getLatestNews } from '../api/newsApi'

export function useLatestNews(token: string | null | undefined, enabled = true) {
  return useQuery({
    queryKey: queryKeys.news.latest(token),
    queryFn: () => getLatestNews(token!),
    enabled: Boolean(token) && enabled,
    staleTime: 60_000,
  })
}
