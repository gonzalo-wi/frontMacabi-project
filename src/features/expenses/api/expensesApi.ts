import { apiMultipart, apiRequest } from '@/lib/api/apiClient'
import type {
  ExpenseAnalyticsDTO,
  ExpenseCategoryDTO,
  ExpenseDTO,
  ExpenseSummaryDTO,
  PaginatedExpensesDTO,
  ProjectBudgetDTO,
} from '../model/types'

export const RECEIPT_ACCEPT = 'image/jpeg,image/png,image/webp,application/pdf'
export const RECEIPT_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'] as const
export const RECEIPT_MAX_BYTES = 2 * 1024 * 1024

export function validateReceiptFile(file: File): string | null {
  if (!RECEIPT_MIME_TYPES.includes(file.type as (typeof RECEIPT_MIME_TYPES)[number])) {
    return 'El comprobante debe ser JPG, PNG, WebP o PDF.'
  }
  if (file.size > RECEIPT_MAX_BYTES) {
    return 'El comprobante no puede superar 2 MB.'
  }
  return null
}

export type CreateExpenseBody = {
  project_id: string
  amount: string
  currency?: string
  description: string
  expense_date: string // YYYY-MM-DD
  category_id?: string
}

export type PatchExpenseBody = {
  amount?: string
  currency?: string
  description?: string
  expense_date?: string
  category_id?: string // "" to remove
  receipt_storage_path?: string
}

export function listProjectExpenses(
  token: string,
  projectId: string,
  page = 1,
  pageSize = 50,
): Promise<PaginatedExpensesDTO> {
  const q = new URLSearchParams({
    page: String(page),
    page_size: String(pageSize),
  })
  return apiRequest<PaginatedExpensesDTO>(`/api/projects/${projectId}/expenses?${q}`, { token })
}

export function listMyExpenses(
  token: string,
  page = 1,
  pageSize = 50,
): Promise<PaginatedExpensesDTO> {
  const q = new URLSearchParams({ page: String(page), page_size: String(pageSize) })
  return apiRequest<PaginatedExpensesDTO>(`/api/expenses/my?${q}`, { token })
}

export type ExpenseListFilters = {
  page?: number
  pageSize?: number
  projectId?: string
  status?: string
  from?: string
  to?: string
  q?: string
}

/** Lista global de gastos (admin), paginada y filtrada server-side. */
export function listAllExpenses(
  token: string,
  f: ExpenseListFilters = {},
): Promise<PaginatedExpensesDTO> {
  const q = new URLSearchParams({
    page: String(f.page ?? 1),
    page_size: String(f.pageSize ?? 20),
  })
  if (f.projectId && f.projectId !== 'all') q.set('project_id', f.projectId)
  if (f.status && f.status !== 'all') q.set('status', f.status)
  if (f.from) q.set('from', f.from)
  if (f.to) q.set('to', f.to)
  if (f.q?.trim()) q.set('q', f.q.trim())
  return apiRequest<PaginatedExpensesDTO>(`/api/expenses?${q}`, { token })
}

export function getExpense(token: string, id: string): Promise<ExpenseDTO> {
  return apiRequest<ExpenseDTO>(`/api/expenses/${id}`, { token })
}

export function getExpenseAnalytics(
  token: string,
  from?: string,
  to?: string,
): Promise<ExpenseAnalyticsDTO> {
  const q = new URLSearchParams()
  if (from) q.set('from', from)
  if (to) q.set('to', to)
  const tail = q.toString()
  return apiRequest<ExpenseAnalyticsDTO>(`/api/expenses/analytics${tail ? `?${tail}` : ''}`, {
    token,
  })
}

export function getProjectExpenseSummary(
  token: string,
  projectId: string,
  from?: string,
  to?: string,
): Promise<ExpenseSummaryDTO> {
  const q = new URLSearchParams()
  if (from) q.set('from', from)
  if (to) q.set('to', to)
  const tail = q.toString()
  const url =
    `/api/projects/${projectId}/expenses/summary` + (tail ? `?${tail}` : '')
  return apiRequest<ExpenseSummaryDTO>(url, { token })
}

export function createExpense(
  token: string,
  body: CreateExpenseBody,
  receiptFile?: File | null,
): Promise<ExpenseDTO> {
  if (receiptFile) {
    const fd = new FormData()
    fd.append('project_id', body.project_id)
    fd.append('amount', body.amount)
    fd.append('description', body.description)
    fd.append('expense_date', body.expense_date)
    if (body.currency) fd.append('currency', body.currency)
    if (body.category_id) fd.append('category_id', body.category_id)
    fd.append('file', receiptFile)
    return apiMultipart<ExpenseDTO>('/api/expenses', fd, token)
  }
  return apiRequest<ExpenseDTO>('/api/expenses', { method: 'POST', token, body })
}

// ── Presupuesto mensual por proyecto ──────────────────────────

export function getProjectBudget(token: string, projectId: string): Promise<ProjectBudgetDTO> {
  return apiRequest<ProjectBudgetDTO>(`/api/projects/${projectId}/expenses/budget`, { token })
}

/** monthlyAmount = null limpia el presupuesto. */
export function setProjectBudget(
  token: string,
  projectId: string,
  monthlyAmount: string | null,
): Promise<void> {
  return apiRequest<void>(`/api/projects/${projectId}/expenses/budget`, {
    method: 'PUT',
    token,
    body: { monthly_amount: monthlyAmount },
  })
}

// ── Categories ────────────────────────────────────────────────

export function getCategories(token: string): Promise<ExpenseCategoryDTO[]> {
  return apiRequest<ExpenseCategoryDTO[]>('/api/expenses/categories', { token })
}

export function createCategory(token: string, name: string): Promise<ExpenseCategoryDTO> {
  return apiRequest<ExpenseCategoryDTO>('/api/expenses/categories', {
    method: 'POST',
    token,
    body: { name },
  })
}

export function deleteCategory(token: string, id: string): Promise<void> {
  return apiRequest<void>(`/api/expenses/categories/${id}`, { method: 'DELETE', token })
}

export function patchExpense(
  token: string,
  id: string,
  body: PatchExpenseBody,
): Promise<ExpenseDTO> {
  return apiRequest<ExpenseDTO>(`/api/expenses/${id}`, { method: 'PATCH', token, body })
}

export function approveExpense(token: string, id: string): Promise<void> {
  return apiRequest<void>(`/api/expenses/${id}/approve`, { method: 'PATCH', token })
}

export function rejectExpense(token: string, id: string, rejection_reason?: string): Promise<void> {
  return apiRequest<void>(`/api/expenses/${id}/reject`, {
    method: 'PATCH',
    token,
    body: { rejection_reason: rejection_reason ?? '' },
  })
}

export function deleteExpense(token: string, id: string): Promise<void> {
  return apiRequest<void>(`/api/expenses/${id}`, { method: 'DELETE', token })
}

export type ReceiptUploadResponse = {
  upload_url: string
  path: string
  upload_headers?: Record<string, string>
}

export function receiptUploadUrl(token: string, expenseId: string, contentType: string) {
  return apiRequest<ReceiptUploadResponse>(`/api/expenses/${expenseId}/receipt-upload`, {
    method: 'POST',
    token,
    body: { content_type: contentType },
  })
}

export function receiptViewUrl(token: string, expenseId: string) {
  return apiRequest<{ view_url: string }>(`/api/expenses/${expenseId}/receipt`, { token })
}

export function removeReceipt(token: string, expenseId: string): Promise<void> {
  return apiRequest<void>(`/api/expenses/${expenseId}/receipt`, { method: 'DELETE', token })
}

/** Sube el comprobante vía API (evita CORS con Supabase desde el navegador). */
export function uploadReceipt(token: string, expenseId: string, file: File) {
  const fd = new FormData()
  fd.append('file', file)
  return apiMultipart<{ path: string }>(`/api/expenses/${expenseId}/receipt`, fd, token)
}
