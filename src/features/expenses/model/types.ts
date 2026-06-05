/** Negocio: mismos estados que otros módulos (es-AR MAYÚSCULAS). */
export type ExpenseStatus = 'PENDIENTE' | 'APROBADO' | 'RECHAZADO'

export interface ExpenseCategoryDTO {
  id: string
  name: string
  created_at: string
}

export interface ExpenseDTO {
  id: string
  project_id: string
  /** Present in global “mis cargas” list when the API joins projects */
  project_name?: string
  submitted_by_user_id: string
  submitter_name?: string
  approved_by_name?: string | null
  amount: string
  currency: string
  description: string
  expense_date: string
  status: ExpenseStatus
  category_id?: string | null
  category_name?: string | null
  receipt_storage_path?: string | null
  approved_by_user_id?: string | null
  approved_at?: string | null
  rejection_reason?: string | null
  created_at: string
  updated_at: string
}

export interface PaginatedExpensesDTO {
  data: ExpenseDTO[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

export interface ExpenseSummaryDTO {
  total_approved: string
  by_month: { month: string; total: string }[]
}

export interface ExpenseNotificationDTO {
  id: string
  expense_id: string
  project_id: string
  message: string
  read_at: string | null
  created_at: string
}

export interface UnreadCountDTO {
  unread_count: number
}

export interface ExpenseAnalyticsDTO {
  total_approved: string
  total_count: number
  pending_count: number
  approved_count: number
  rejected_count: number
  granularity: 'day' | 'month'
  by_project: { project_id: string; project_name: string; total: string }[]
  by_bucket: { bucket: string; total: string }[]
}
