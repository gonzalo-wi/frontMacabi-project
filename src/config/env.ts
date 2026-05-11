/**
 * Variables de entorno (Vite: solo las que empiezan con VITE_).
 * En `npm run dev`, suele venir de `.env.development` o `.env.development.local`.
 * En build, de `.env.production`, `.env` o variables del entorno de CI.
 */
const raw = import.meta.env.VITE_API_URL

if (typeof raw !== 'string' || !raw.trim()) {
  throw new Error(
    '[config] Falta VITE_API_URL. En la raíz de `frontend/` creá un `.env` a partir de `.env.example`, o definí la variable en el entorno de build.',
  )
}

/**
 * Base del servidor HTTP que expone rutas `/api/...`, sin barra final y sin sufijo `/api`.
 * Así una `VITE_API_URL` tipo `http://localhost:8081/api` no genera `/api/api/event-instances/...` (404 de Gin).
 */
function normalizeApiOrigin(url: string): string {
  const trimmed = url.trim().replace(/\/+$/, '')
  if (trimmed.toLowerCase().endsWith('/api')) {
    return trimmed.slice(0, -'/api'.length)
  }
  return trimmed
}

export const apiBaseUrl = normalizeApiOrigin(raw)
