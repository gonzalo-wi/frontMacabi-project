import type { ExpenseAnalyticsDTO, ExpenseSummaryDTO } from '@/features/expenses/model/types'

/** Conteos y montos por estado en un período (admin global o por proyecto). */
export type ExpenseStatusMetrics = {
  total_approved: string
  approved_count: number
  pending_count: number
  pending_total: string
  rejected_count: number
  rejected_total: string
}

export function expenseCountLabel(count: number): string {
  return count === 1 ? '1 gasto' : `${count} gastos`
}

export function metricsFromAnalytics(data: ExpenseAnalyticsDTO): ExpenseStatusMetrics {
  return {
    total_approved: data.total_approved,
    approved_count: data.approved_count,
    pending_count: data.pending_count,
    pending_total: data.pending_total,
    rejected_count: data.rejected_count,
    rejected_total: data.rejected_total,
  }
}

export function metricsFromSummary(data: ExpenseSummaryDTO): ExpenseStatusMetrics {
  return {
    total_approved: data.total_approved,
    approved_count: data.approved_count,
    pending_count: data.pending_count,
    pending_total: data.pending_total,
    rejected_count: data.rejected_count,
    rejected_total: data.rejected_total,
  }
}
