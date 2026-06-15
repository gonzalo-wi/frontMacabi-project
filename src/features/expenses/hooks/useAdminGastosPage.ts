import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'

import { getExpenseAnalytics, listAllExpenses } from '@/features/expenses/api/expensesApi'
import type { ExpenseStatus } from '@/features/expenses/model/types'
import { listProjects } from '@/features/projects/api/projectsApi'
import { PAGE_SIZE } from '@/lib/pagination'
import { queryKeys } from '@/lib/queryKeys'

type AdminGastosFilters = {
  query: string
  projectFilter: string
  statusFilter: ExpenseStatus | 'all'
  desde: string
  hasta: string
}

/** Queries de la vista admin de gastos (analytics, proyectos, listado paginado). */
export function useAdminGastosPage(
  token: string | null | undefined,
  isRestoring: boolean,
  filters: AdminGastosFilters,
) {
  const { query, projectFilter, statusFilter, desde, hasta } = filters
  const [page, setPage] = useState(1)

  const resetKey = [query, projectFilter, statusFilter, desde, hasta].join('\0')
  const [prevResetKey, setPrevResetKey] = useState(resetKey)
  if (resetKey !== prevResetKey) {
    setPrevResetKey(resetKey)
    setPage(1)
  }

  const enabled = Boolean(token) && !isRestoring

  const analyticsQ = useQuery({
    queryKey: queryKeys.expenses.analytics(token, desde, hasta),
    enabled,
    queryFn: () => getExpenseAnalytics(token!, desde || undefined, hasta || undefined),
  })

  const projectsQ = useQuery({
    queryKey: queryKeys.projects.allMin(token),
    enabled,
    queryFn: () => listProjects(token!, 1, 100),
  })

  const listQ = useQuery({
    queryKey: queryKeys.expenses.adminList(token, page, projectFilter, statusFilter, desde, hasta, query),
    enabled,
    queryFn: () =>
      listAllExpenses(token!, {
        page,
        pageSize: PAGE_SIZE,
        projectId: projectFilter,
        status: statusFilter,
        from: desde || undefined,
        to: hasta || undefined,
        q: query,
      }),
  })

  return {
    page,
    setPage,
    analyticsQ,
    projectsQ,
    listQ,
    projectOptions: projectsQ.data?.data ?? [],
    expenses: listQ.data?.data ?? [],
  }
}
