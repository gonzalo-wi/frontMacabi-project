import path from 'node:path'
import { fileURLToPath } from 'node:url'

import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // Usa el manifest.json que ya existe en /public
      manifest: {
        name: 'Macabi Madrijim',
        short_name: 'Macabi',
        description: 'App de gestión para madrijim de Macabi',
        start_url: '/',
        display: 'standalone',
        background_color: '#1e3a5f',
        theme_color: '#1e3a5f',
        orientation: 'portrait',
        icons: [
          {
            src: '/logo_macabi.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/logo_macabi.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        // Cachea assets estáticos del build; las llamadas a /api siempre van a la red
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        navigateFallback: 'index.html',
        runtimeCaching: [
          {
            urlPattern: /^https?:\/\/.*\/api\/.*/,
            handler: 'NetworkOnly',
          },
        ],
      },
      devOptions: {
        // Activa el SW también en `npm run dev` para que puedas probarlo
        enabled: true,
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
