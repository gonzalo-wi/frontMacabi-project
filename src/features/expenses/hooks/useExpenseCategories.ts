import { useQuery } from '@tanstack/react-query'

import { getCategories } from '@/features/expenses/api/expensesApi'
import { queryKeys } from '@/lib/queryKeys'

export function useExpenseCategories(token: string | null | undefined, enabled = true) {
  return useQuery({
    queryKey: queryKeys.expenses.categories(token),
    queryFn: () => getCategories(token!),
    enabled: Boolean(token) && enabled,
    staleTime: 5 * 60_000,
  })
}
