import { useQuery } from '@tanstack/react-query'

import { fetchAllUsersForAdmin } from '@/features/users/lib/fetchAllUsersForAdmin'
import { queryKeys } from '@/lib/queryKeys'

export function useAdminUsers(
  token: string | null | undefined,
  isRestoring = false,
  extraEnabled = true,
) {
  return useQuery({
    queryKey: queryKeys.users.all(token),
    enabled: Boolean(token) && !isRestoring && extraEnabled,
    queryFn: () => fetchAllUsersForAdmin(token!),
    staleTime: 2 * 60_000,
  })
}
