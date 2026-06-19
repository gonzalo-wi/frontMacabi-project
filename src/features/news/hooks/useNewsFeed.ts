import { useQuery } from '@tanstack/react-query'

import { queryKeys } from '@/lib/queryKeys'
import { listPublishedNews } from '../api/newsApi'

export function useNewsFeed(token: string | null | undefined, page = 1, enabled = true) {
  return useQuery({
    queryKey: queryKeys.news.feed(token, page),
    queryFn: () => listPublishedNews(token!, page, 20),
    enabled: Boolean(token) && enabled,
    staleTime: 30_000,
  })
}
