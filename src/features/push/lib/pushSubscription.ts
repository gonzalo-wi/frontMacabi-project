import {
  getPushVapidPublicKey,
  registerPushSubscription,
  unregisterPushSubscription,
} from '../api/pushApi'

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)))
}

const isPushSupported =
  typeof navigator !== 'undefined' &&
  'serviceWorker' in navigator &&
  'PushManager' in window

/**
 * Pide permiso, suscribe al PushManager y registra la suscripción en el backend.
 * Si el permiso fue denegado previamente, sale en silencio.
 */
export async function subscribeToPush(token: string): Promise<void> {
  if (!isPushSupported) return

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return

  const registration = await navigator.serviceWorker.ready

  // Si ya hay una suscripción activa, re-registrarla en el backend (por si cambió el servidor)
  const existing = await registration.pushManager.getSubscription()
  if (existing) {
    const json = existing.toJSON()
    if (json.endpoint && json.keys?.p256dh && json.keys?.auth) {
      await registerPushSubscription(token, {
        endpoint: json.endpoint,
        p256dh: json.keys.p256dh,
        auth: json.keys.auth,
      })
    }
    return
  }

  const publicKey = await getPushVapidPublicKey(token)

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
  })

  const json = subscription.toJSON()
  if (json.endpoint && json.keys?.p256dh && json.keys?.auth) {
    await registerPushSubscription(token, {
      endpoint: json.endpoint,
      p256dh: json.keys.p256dh,
      auth: json.keys.auth,
    })
  }
}

/**
 * Elimina la suscripción del backend y la cancela en el navegador.
 */
export async function unsubscribeFromPush(token: string): Promise<void> {
  if (!isPushSupported) return

  const registration = await navigator.serviceWorker.getRegistration()
  if (!registration) return

  const subscription = await registration.pushManager.getSubscription()
  if (!subscription) return

  const { endpoint } = subscription.toJSON()
  if (endpoint) {
    await unregisterPushSubscription(token, endpoint)
  }

  await subscription.unsubscribe()
}
