import { apiRequest } from '@/lib/api/apiClient'
import type { NewsNotificationDTO, NewsUnreadCountDTO } from '../model/types'

export function listNewsNotifications(token: string): Promise<NewsNotificationDTO[]> {
  return apiRequest<{ data: NewsNotificationDTO[] } | NewsNotificationDTO[]>(
    '/api/news/notifications',
    { token },
  ).then((r) => (Array.isArray(r) ? r : r.data))
}

export function getNewsUnreadCount(token: string): Promise<NewsUnreadCountDTO> {
  return apiRequest<NewsUnreadCountDTO>('/api/news/notifications/unread-count', { token })
}

export function markNewsNotificationRead(token: string, id: string): Promise<void> {
  return apiRequest<void>(`/api/news/notifications/${id}/read`, { method: 'PATCH', token })
}

export function markAllNewsNotificationsRead(token: string): Promise<void> {
  return apiRequest<void>('/api/news/notifications/read-all', { method: 'PATCH', token })
}
