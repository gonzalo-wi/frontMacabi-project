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

const STORAGE_KEY = 'macabi_auth'

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

const AuthContext = createContext<AuthContextValue | null>(null)

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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null)
  const [user, setUser] = useState<UserDTO | null>(null)
  const [isRestoring, setIsRestoring] = useState(true)

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
        writeStoredSession({ token: stored.token, user: fresh })
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

  const setSession = useCallback((nextToken: string, nextUser: UserDTO) => {
    setToken(nextToken)
    setUser(nextUser)
    writeStoredSession({ token: nextToken, user: nextUser })
  }, [])

  const logout = useCallback(() => {
    setToken(null)
    setUser(null)
    writeStoredSession(null)
  }, [])

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

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return ctx
}
