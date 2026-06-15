import { apiRequest } from '@/lib/api/apiClient'

export async function getPushVapidPublicKey(token: string): Promise<string> {
  const res = await apiRequest<{ public_key: string }>('/api/push/vapid-public-key', { token })
  return res.public_key
}

export async function registerPushSubscription(
  token: string,
  sub: { endpoint: string; p256dh: string; auth: string },
): Promise<void> {
  await apiRequest<void>('/api/push/subscriptions', {
    method: 'POST',
    token,
    body: sub,
  })
}

export async function unregisterPushSubscription(
  token: string,
  endpoint: string,
): Promise<void> {
  await apiRequest<void>('/api/push/subscriptions', {
    method: 'DELETE',
    token,
    body: { endpoint },
  })
}
