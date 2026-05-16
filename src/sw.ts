/// <reference lib="webworker" />

import { clientsClaim } from 'workbox-core'
import {
  cleanupOutdatedCaches,
  createHandlerBoundToURL,
  precacheAndRoute,
} from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'
import { NetworkOnly } from 'workbox-strategies'

declare let self: ServiceWorkerGlobalScope

self.skipWaiting()
clientsClaim()

// Precachear assets estáticos generados por Vite
precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()

// SPA: todas las navegaciones sirven index.html
registerRoute(new NavigationRoute(createHandlerBoundToURL('index.html')))

// Llamadas a /api/: siempre van a la red
registerRoute(
  ({ url }: { url: URL }) => url.pathname.startsWith('/api/'),
  new NetworkOnly(),
)

// ── Push notifications ─────────────────────────────────────────────────────

self.addEventListener('push', (event) => {
  if (!event.data) return

  const data = event.data.json() as { title: string; body: string; url?: string }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/logo_macabi.png',
      badge: '/logo_macabi.png',
      data: { url: data.url },
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = (event.notification.data as { url?: string } | null)?.url
  if (url) {
    event.waitUntil(clients.openWindow(url))
  }
})
