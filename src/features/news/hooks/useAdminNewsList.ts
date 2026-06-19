import { useQuery } from '@tanstack/react-query'

import { queryKeys } from '@/lib/queryKeys'
import { listAllNews } from '../api/newsApi'

export function useAdminNewsList(token: string | null | undefined, page = 1, enabled = true) {
  return useQuery({
    queryKey: queryKeys.news.adminList(token, page),
    queryFn: () => listAllNews(token!, page, 20),
    enabled: Boolean(token) && enabled,
    staleTime: 30_000,
  })
}
