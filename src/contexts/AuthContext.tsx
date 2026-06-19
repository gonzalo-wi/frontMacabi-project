import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

import { getMe } from '@/lib/api/auth'
import type { UserDTO } from '@/lib/api/types'
import { subscribeToPush, unsubscribeFromPush } from '@/features/push/lib/pushSubscription'

const STORAGE_KEY = 'macabi_auth'

// ======================================================
// Tipos
// ======================================================

type StoredSession = {
  token: string
  user: UserDTO
}

type AuthContextValue = {
  token: string | null
  user: UserDTO | null
  isRestoring: boolean
  isAuthenticated: boolean
  setSession: (token: string, user: UserDTO) => void
  logout: () => void
}

// ======================================================
// Context
// ======================================================

const AuthContext = createContext<AuthContextValue | null>(null)

// ======================================================
// Local Storage
// ======================================================

function readStoredSession(): StoredSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)

    if (!raw) return null

    const data = JSON.parse(raw) as StoredSession

    if (!data?.token || !data?.user?.id) return null

    return data
  } catch {
    return null
  }
}

function writeStoredSession(session: StoredSession | null) {
  if (!session) {
    localStorage.removeItem(STORAGE_KEY)
    return
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
}

// ======================================================
// Provider
// ======================================================

export function AuthProvider({ children }: { children: ReactNode }) {
  // --------------------------
  // State
  // --------------------------

  const [token, setToken] = useState<string | null>(null)
  const [user, setUser] = useState<UserDTO | null>(null)
  const [isRestoring, setIsRestoring] = useState(true)

  // --------------------------
  // Bootstrap
  // --------------------------

  useEffect(() => {
    let cancelled = false

    async function bootstrap() {
      const stored = readStoredSession()

      if (!stored) {
        if (!cancelled) setIsRestoring(false)
        return
      }

      setToken(stored.token)
      setUser(stored.user)

      try {
        const fresh = await getMe(stored.token)

        if (cancelled) return

        setUser(fresh)

        writeStoredSession({
          token: stored.token,
          user: fresh,
        })

        void subscribeToPush(stored.token).catch(() => {})
      } catch {
        if (cancelled) return

        setToken(null)
        setUser(null)

        writeStoredSession(null)
      } finally {
        if (!cancelled) setIsRestoring(false)
      }
    }

    void bootstrap()

    return () => {
      cancelled = true
    }
  }, [])

  // --------------------------
  // Login
  // --------------------------

  const setSession = useCallback(
    (nextToken: string, nextUser: UserDTO) => {
      setToken(nextToken)
      setUser(nextUser)

      writeStoredSession({
        token: nextToken,
        user: nextUser,
      })

      void subscribeToPush(nextToken).catch(() => {})
    },
    [],
  )

  // --------------------------
  // Logout
  // --------------------------

  const logout = useCallback(() => {
    if (token) {
      void unsubscribeFromPush(token).catch(() => {})
    }

    setToken(null)
    setUser(null)

    writeStoredSession(null)
  }, [token])

  // --------------------------
  // Context Value
  // --------------------------

  const value = useMemo<AuthContextValue>(
    () => ({
      token,
      user,
      isRestoring,
      isAuthenticated: Boolean(token && user),
      setSession,
      logout,
    }),
    [token, user, isRestoring, setSession, logout],
  )

  // --------------------------
  // Provider
  // --------------------------

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

// ======================================================
// Hook
// ======================================================

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)

  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider')
  }

  return ctx
}