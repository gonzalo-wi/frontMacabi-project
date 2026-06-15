import { apiRequest } from '@/lib/api/apiClient'
import type { EventNotificationDTO, UnreadCountDTO } from '../model/types'

export function listEventNotifications(token: string): Promise<EventNotificationDTO[]> {
  return apiRequest<{ data: EventNotificationDTO[] } | EventNotificationDTO[]>(
    '/api/event-instances/notifications',
    { token },
  ).then((r) => (Array.isArray(r) ? r : r.data))
}

export function getEventUnreadCount(token: string): Promise<UnreadCountDTO> {
  return apiRequest<UnreadCountDTO>('/api/event-instances/notifications/unread-count', { token })
}

export function markEventNotificationRead(token: string, id: string): Promise<void> {
  return apiRequest<void>(`/api/event-instances/notifications/${id}/read`, { method: 'PATCH', token })
}

export function markAllEventNotificationsRead(token: string): Promise<void> {
  return apiRequest<void>('/api/event-instances/notifications/read-all', { method: 'PATCH', token })
}
