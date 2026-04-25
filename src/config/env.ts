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

/** Base del API sin barra final */
export const apiBaseUrl = raw.trim().replace(/\/+$/, '')
