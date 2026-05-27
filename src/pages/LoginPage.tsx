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
    <div className="min-h-screen flex flex-col lg:flex-row relative">
      {/* Decorative background glow on the whole login page */}
      <div className="absolute top-0 right-0 w-[50%] h-[50%] bg-primary/5 rounded-full blur-3xl pointer-events-none hidden lg:block" />

      {/* ── Mobile hero (dark top section) ───────────────── */}
      <div className="lg:hidden relative bg-sidebar overflow-hidden flex-shrink-0">
        {/* Dot grid */}
        <div
          className="absolute inset-0 opacity-[0.05] pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(circle, white 1.5px, transparent 1.5px)',
            backgroundSize: '24px 24px',
          }}
        />
        {/* Glow blobs */}
        <div className="absolute -top-20 -right-20 w-56 h-56 rounded-full bg-sidebar-primary/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-40 h-40 rounded-full bg-sidebar-primary/10 blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center text-center px-8 pt-12 pb-14">
          <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center shadow-2xl mb-4 hover:scale-105 active:scale-95 transition-transform duration-200">
            <img src="/logo_macabi.png" alt="Macabi" className="w-8 h-8 object-contain brightness-0 invert" />
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight leading-none">Macabi</h1>
          <p className="text-xs text-sidebar-muted-foreground mt-1.5 font-medium uppercase tracking-wider">Organización Hebrea Argentina</p>
        </div>
      </div>

      {/* ── Left branding panel (desktop only) ───────────── */}
      <div className="hidden lg:flex lg:w-[46%] xl:w-[50%] bg-sidebar flex-col justify-between p-12 relative overflow-hidden">
        {/* Dot grid background */}
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(circle, white 1.5px, transparent 1.5px)',
            backgroundSize: '28px 28px',
          }}
        />
        {/* Glow blobs */}
        <div className="absolute -top-32 -right-32 w-80 h-80 rounded-full bg-sidebar-primary/15 blur-3xl pointer-events-none animate-pulse" />
        <div className="absolute -bottom-32 -left-32 w-80 h-80 rounded-full bg-sidebar-primary/10 blur-3xl pointer-events-none" />

        {/* Top: logo + brand name */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center shadow-lg">
            <img
              src="/logo_macabi.png"
              alt="Macabi"
              className="w-6 h-6 object-contain brightness-0 invert"
            />
          </div>
          <div className="leading-none">
            <p className="font-bold text-sidebar-foreground text-base tracking-wide">Macabi</p>
            <p className="text-sidebar-muted-foreground text-[10px] uppercase font-bold tracking-wider mt-0.5">Organización Hebrea Argentina</p>
          </div>
        </div>

        {/* Center: main message */}
        <div className="relative z-10 space-y-10 my-auto">
          {/* Headline */}
          <div className="space-y-4">
            <h1 className="text-4xl xl:text-5xl font-extrabold text-sidebar-foreground leading-[1.1] tracking-tight">
              Todo lo que<br />
              necesitás,<br />
              en un solo lugar.
            </h1>
            <p className="text-sm text-sidebar-muted-foreground leading-relaxed max-w-sm">
              Plataforma digital para madrijim y coordinadores de Macabi Argentina. Administrá comidas, reembolsos, stock de materiales y asistencia de jornadas sin complicaciones.
            </p>
          </div>

          {/* Features grid */}
          <div className="grid grid-cols-2 gap-3 max-w-lg">
            {features.map(({ icon: Icon, label, desc }) => (
              <div
                key={label}
                className="flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-white/5 border border-white/8 hover:bg-white/10 hover:border-white/20 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 backdrop-blur-md select-none group"
              >
                <div className="p-2 rounded-lg bg-white/15 group-hover:bg-primary/20 group-hover:text-primary transition-colors shrink-0">
                  <Icon className="w-4 h-4 text-white/80 shrink-0" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-sidebar-foreground">{label}</p>
                  <p className="text-[11px] text-sidebar-muted-foreground mt-0.5 leading-snug">{desc}</p>
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

      {/* ── Right / bottom form panel ──────────────────────── */}
      <div className="flex-1 flex flex-col bg-background rounded-t-3xl lg:rounded-none -mt-6 lg:mt-0 relative z-10 shadow-[0_-8px_30px_rgba(0,0,0,0.08)] lg:shadow-none border-t border-border/30 lg:border-t-0">

        {/* Drag handle (mobile only) */}
        <div className="lg:hidden flex justify-center pt-3 pb-1">
          <div className="w-12 h-1 rounded-full bg-muted-foreground/15" />
        </div>

        {/* Form container — centered vertically on desktop */}
        <div className="flex-1 flex items-start lg:items-center justify-center px-6 lg:px-16 pt-8 pb-10 lg:py-8">
          <div className="w-full max-w-sm space-y-6">

            {/* Heading */}
            <div className="space-y-1">
              <h2 className="text-2xl font-bold tracking-tight text-foreground">Iniciar sesión</h2>
              <p className="text-muted-foreground text-sm">
                Ingresá tus credenciales para acceder a la plataforma
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">

              {/* Email */}
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="tu.email@macabi.org.ar"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11 rounded-xl focus-visible:ring-primary/20 focus-visible:border-primary border-border bg-card"
                  autoComplete="email"
                  disabled={isLoading}
                />
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Contraseña</Label>
                  <Link
                    to="/recuperar-password"
                    className="text-xs text-primary hover:text-primary/80 transition-colors font-semibold"
                    tabIndex={-1}
                  >
                    ¿La olvidaste?
                  </Link>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-11 pr-10 rounded-xl focus-visible:ring-primary/20 focus-visible:border-primary border-border bg-card"
                    autoComplete="current-password"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    tabIndex={-1}
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="text-xs text-destructive bg-destructive/10 rounded-xl px-4 py-3 border border-destructive/20 animate-shake">
                  {error}
                </div>
              )}

              {/* Submit */}
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

            <p className="text-xs text-muted-foreground text-center leading-relaxed max-w-[280px] mx-auto">
              El acceso es exclusivo para madrijim invitados. Si necesitás una cuenta, contactá al coordinador de tu sede.
            </p>

          </div>
        </div>

        {/* Desktop footer */}
        <div className="hidden lg:block px-16 pb-8">
          <p className="text-xs text-muted-foreground/50">
            © {new Date().getFullYear()} Macabi Argentina · Todos los derechos reservados
          </p>
        </div>
      </div>
    </div>
  )
}
