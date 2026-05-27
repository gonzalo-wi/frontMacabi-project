import { apiRequest } from '@/lib/api/apiClient'
import type { StockNotificationDTO, UnreadCountDTO } from '../model/types'

export function listNotifications(token: string, limit = 20): Promise<StockNotificationDTO[]> {
  const q = new URLSearchParams({ limit: String(limit) })
  return apiRequest<{ data: StockNotificationDTO[] } | StockNotificationDTO[]>(
    `/api/stock/notifications?${q}`,
    { token },
  ).then((r) => (Array.isArray(r) ? r : r.data))
}

export function getUnreadCount(token: string): Promise<UnreadCountDTO> {
  return apiRequest<UnreadCountDTO>('/api/stock/notifications/unread-count', { token })
}

export function markNotificationRead(token: string, id: string): Promise<void> {
  return apiRequest<void>(`/api/stock/notifications/${id}/read`, { method: 'PATCH', token })
}
