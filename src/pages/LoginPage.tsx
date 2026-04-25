import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Bus, Eye, EyeOff, Loader2, Package, Receipt, UtensilsCrossed } from 'lucide-react'

import { ApiError } from '@/lib/api/apiClient'
import { login } from '@/lib/api/auth'
import { useAuth } from '@/hooks/useAuth'

const features = [
  { icon: Bus, label: 'Micros', desc: 'Reservá tu asiento' },
  { icon: UtensilsCrossed, label: 'Comidas', desc: 'Gestioná almuerzos' },
  { icon: Receipt, label: 'Reembolsos', desc: 'Controlá tus gastos' },
  { icon: Package, label: 'Reservas', desc: 'Access al inventario' },
]

export default function LoginPage() {
  const navigate = useNavigate()
  const { isAuthenticated, isRestoring, setSession } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
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
    <div className="min-h-screen flex">

      {/* ── Left branding panel (desktop only) ───────────── */}
      <div className="hidden lg:flex lg:w-[46%] xl:w-[50%] bg-sidebar flex-col justify-between p-10 relative overflow-hidden">

        {/* Dot grid background */}
        <div
          className="absolute inset-0 opacity-[0.04] pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(circle, white 1.5px, transparent 1.5px)',
            backgroundSize: '28px 28px',
          }}
        />
        {/* Glow blobs */}
        <div className="absolute -top-32 -right-32 w-80 h-80 rounded-full bg-sidebar-primary/8 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -left-32 w-80 h-80 rounded-full bg-sidebar-primary/6 blur-3xl pointer-events-none" />

        {/* Top: logo + brand name */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center">
            <img
              src="/logo_macabi.png"
              alt="Macabi"
              className="w-6 h-6 object-contain brightness-0 invert"
            />
          </div>
          <div className="leading-none">
            <p className="font-bold text-sidebar-foreground text-base">Macabi</p>
            <p className="text-sidebar-muted-foreground text-xs mt-0.5">Organización Hebrea Argentina</p>
          </div>
        </div>

        {/* Center: main message */}
        <div className="relative z-10 space-y-8">
          {/* Headline */}
          <div>
            <h1 className="text-4xl font-extrabold text-sidebar-foreground leading-[1.15] tracking-tight">
              Todo lo que<br />
              necesitás,<br />
              en un lugar.
            </h1>
            <p className="mt-4 text-sm text-sidebar-muted-foreground leading-relaxed max-w-xs">
              Plataforma para madrijim de Macabi Argentina — micros, comidas, reembolsos y reservas de materiales.
            </p>
          </div>

          {/* Features grid */}
          <div className="grid grid-cols-2 gap-2">
            {features.map(({ icon: Icon, label, desc }) => (
              <div
                key={label}
                className="flex items-center gap-2.5 px-3.5 py-3 rounded-xl bg-white/6 border border-white/8 hover:bg-white/10 transition-colors"
              >
                <Icon className="w-4 h-4 text-white/70 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-sidebar-foreground">{label}</p>
                  <p className="text-[11px] text-sidebar-muted-foreground">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom: version/info */}
        <div className="relative z-10">
          <p className="text-xs text-sidebar-muted-foreground/60">
            © {new Date().getFullYear()} Macabi Argentina · Plataforma Madrijim
          </p>
        </div>
      </div>

      {/* ── Right form panel ───────────────────────────────── */}
      <div className="flex-1 flex flex-col bg-background">

        {/* Mobile brand header */}
        <div className="lg:hidden flex items-center gap-3 px-6 pt-12 pb-6">
          <div className="w-12 h-12 rounded-2xl bg-sidebar flex items-center justify-center shadow-lg shrink-0">
            <img
              src="/logo_macabi.png"
              alt="Macabi"
              className="w-7 h-7 object-contain brightness-0 invert"
            />
          </div>
          <div>
            <p className="font-bold text-lg tracking-tight">Macabi</p>
            <p className="text-xs text-muted-foreground">Organización Hebrea Argentina</p>
          </div>
        </div>

        {/* Form container — centered vertically on desktop */}
        <div className="flex-1 flex items-center justify-center px-6 lg:px-16 py-8">
          <div className="w-full max-w-sm">

            {/* Heading */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold tracking-tight">Iniciar sesión</h2>
              <p className="text-muted-foreground text-sm mt-1.5">
                Ingresá tus credenciales para acceder
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">

              {/* Email */}
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-sm font-medium">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="tu.email@macabi.org.ar"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11"
                  autoComplete="email"
                  disabled={isLoading}
                />
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-sm font-medium">Contraseña</Label>
                  <Link
                    to="/recuperar-password"
                    className="text-xs text-primary hover:underline font-medium"
                    tabIndex={-1}
                  >
                    ¿Olvidaste tu contraseña?
                  </Link>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-11 pr-10"
                    autoComplete="current-password"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2.5 border border-destructive/20">
                  {error}
                </div>
              )}

              {/* Submit */}
              <Button
                type="submit"
                className="w-full h-11 font-semibold text-sm"
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

            <p className="mt-8 text-xs text-muted-foreground text-center leading-relaxed">
              ¿No tenés cuenta?{' '}
              <span className="text-foreground font-medium">Contactá a tu coordinador</span>
            </p>

          </div>
        </div>

        {/* Desktop footer */}
        <div className="hidden lg:block px-16 pb-8">
          <p className="text-xs text-muted-foreground/60">
            © {new Date().getFullYear()} Macabi Argentina
          </p>
        </div>
      </div>
    </div>
  )
}
