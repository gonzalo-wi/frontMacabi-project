import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PasswordInput } from '@/components/PasswordInput'
import { Label } from '@/components/ui/label'
import { LoginPageLayout } from '@/layouts/auth/LoginPageLayout'
import { ApiError } from '@/lib/api/apiClient'
import { login } from '@/lib/api/auth'
import { useAuth } from '@/hooks/useAuth'

export default function LoginPage() {
  const navigate = useNavigate()
  const { isAuthenticated, isRestoring, setSession } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const loginMutation = useMutation({
    mutationFn: () => login({ email: email.trim(), password }),
    onSuccess: (data) => {
      setSession(data.token, data.user)
      navigate('/app', { replace: true })
    },
    onError: (err: unknown) => {
      const message = err instanceof ApiError ? err.message : 'No se pudo iniciar sesión'
      setError(message)
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!email.trim() || !password) {
      setError('Por favor ingresá tu email y contraseña')
      return
    }
    loginMutation.mutate()
  }

  const isLoading = loginMutation.isPending

  if (!isRestoring && isAuthenticated) {
    return <Navigate to="/app" replace />
  }

  return (
    <LoginPageLayout>
      <div>
        <div className="hidden lg:flex items-center gap-2 mb-5">
          <div className="h-px flex-1 bg-border/70" />
          <div className="flex items-center gap-1.5 px-1">
            <div className="w-1.5 h-1.5 rounded-full bg-primary/50" />
            <span className="text-[10px] font-bold text-muted-foreground/70 uppercase tracking-widest">
              Acceso seguro
            </span>
            <div className="w-1.5 h-1.5 rounded-full bg-primary/50" />
          </div>
          <div className="h-px flex-1 bg-border/70" />
        </div>

        <h2 className="text-2xl font-bold tracking-tight text-foreground">Iniciar sesión</h2>
        <p className="text-muted-foreground text-sm mt-1">
          Ingresá tus credenciales para acceder a la plataforma
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label
            htmlFor="email"
            className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
          >
            Email
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="tu.email@macabi.org.ar"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-11 rounded-xl focus-visible:ring-primary/20 focus-visible:border-primary border-border bg-card lg:bg-background"
            autoComplete="email"
            disabled={isLoading}
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label
              htmlFor="password"
              className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
            >
              Contraseña
            </Label>
            <Link
              to="/recuperar-password"
              className="text-xs text-primary hover:text-primary/80 transition-colors font-semibold"
              tabIndex={-1}
            >
              ¿La olvidaste?
            </Link>
          </div>
          <PasswordInput
            id="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-11 rounded-xl focus-visible:ring-primary/20 focus-visible:border-primary border-border bg-card lg:bg-background"
            autoComplete="current-password"
            disabled={isLoading}
          />
        </div>

        {error && (
          <div className="text-xs text-destructive bg-destructive/8 rounded-xl px-4 py-3 border border-destructive/20 animate-shake">
            {error}
          </div>
        )}

        <Button
          type="submit"
          className="w-full h-11 font-semibold text-sm rounded-xl cursor-pointer shadow-md hover:shadow-lg active:scale-[0.98] transition-all"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Ingresando...
            </>
          ) : (
            'Ingresar'
          )}
        </Button>
      </form>

      <p className="text-xs text-muted-foreground text-center leading-relaxed max-w-[270px] mx-auto">
        El acceso es exclusivo para madrijim invitados. Si necesitás una cuenta, contactá al
        coordinador de tu sede.
      </p>
    </LoginPageLayout>
  )
}
