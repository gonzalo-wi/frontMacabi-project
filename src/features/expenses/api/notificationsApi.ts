import { apiRequest } from '@/lib/api/apiClient'
import type { ExpenseNotificationDTO, UnreadCountDTO } from '../model/types'

export function listExpenseNotifications(token: string): Promise<ExpenseNotificationDTO[]> {
  return apiRequest<{ data: ExpenseNotificationDTO[] } | ExpenseNotificationDTO[]>(
    '/api/expenses/notifications',
    { token },
  ).then((r) => (Array.isArray(r) ? r : r.data))
}

export function getExpenseUnreadCount(token: string): Promise<UnreadCountDTO> {
  return apiRequest<UnreadCountDTO>('/api/expenses/notifications/unread-count', { token })
}

export function markExpenseNotificationRead(token: string, id: string): Promise<void> {
  return apiRequest<void>(`/api/expenses/notifications/${id}/read`, { method: 'PATCH', token })
}
