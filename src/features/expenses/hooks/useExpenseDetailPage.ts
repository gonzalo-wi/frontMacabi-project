import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import {
  approveExpense,
  getExpense,
  getProjectBudget,
  rejectExpense,
} from '@/features/expenses/api/expensesApi'
import { wouldExceedBudget } from '@/features/expenses/lib/budget'
import { useProjectRole } from '@/features/projects/hooks/useProjectRole'
import { queryKeys } from '@/lib/queryKeys'

type UseExpenseDetailPageArgs = {
  id: string | undefined
  token: string | null
  isRestoring: boolean
}

export function useExpenseDetailPage({ id, token, isRestoring }: UseExpenseDetailPageArgs) {
  const qc = useQueryClient()

  const expenseQ = useQuery({
    queryKey: queryKeys.expenses.detail(id, token),
    enabled: Boolean(token && id) && !isRestoring,
    queryFn: () => getExpense(token!, id!),
  })

  const exp = expenseQ.data
  const { canManage } = useProjectRole(exp?.project_id)
  const showActions = Boolean(canManage && exp?.status === 'PENDIENTE')

  async function invalidate() {
    await Promise.all([
      qc.invalidateQueries({ queryKey: [...queryKeys.expenses.detailRoot(), id] }),
      qc.invalidateQueries({ queryKey: [...queryKeys.expenses.projectListRoot(), exp?.project_id] }),
      qc.invalidateQueries({ queryKey: [...queryKeys.expenses.projectSummaryRoot(), exp?.project_id] }),
      qc.invalidateQueries({ queryKey: queryKeys.expenses.myGlobalRoot() }),
    ])
  }

  const approveM = useMutation({
    mutationFn: () => approveExpense(token!, id!),
    onSuccess: async () => {
      toast.success('Gasto aprobado.')
      await invalidate()
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Error'),
  })

  const rejectM = useMutation({
    mutationFn: (reason: string) => rejectExpense(token!, id!, reason),
    onSuccess: async () => {
      toast.success('Gasto rechazado.')
      await invalidate()
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Error'),
  })

  const budgetQ = useQuery({
    queryKey: queryKeys.expenses.projectBudget(exp?.project_id, token),
    enabled: Boolean(token && exp?.project_id && showActions),
    queryFn: () => getProjectBudget(token!, exp!.project_id),
  })

  const overBudget =
    exp && budgetQ.data
      ? wouldExceedBudget(
          budgetQ.data.current_month_approved,
          budgetQ.data.monthly_budget,
          exp.amount,
          exp.expense_date,
          budgetQ.data.month,
        )
      : null

  const anyPending = approveM.isPending || rejectM.isPending

  return {
    expenseQ,
    exp,
    canManage,
    showActions,
    budgetQ,
    overBudget,
    approveM,
    rejectM,
    anyPending,
    invalidate,
  }
}
