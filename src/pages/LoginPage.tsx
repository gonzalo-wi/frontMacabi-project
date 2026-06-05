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
  { icon: Bus,               label: 'Micros',      desc: 'Reservá tu asiento en cada salida' },
  { icon: UtensilsCrossed,   label: 'Comidas',     desc: 'Gestioná almuerzos y menúes' },
  { icon: Receipt,           label: 'Reembolsos',  desc: 'Registrá y controlá tus gastos' },
  { icon: Package,           label: 'Materiales',  desc: 'Accedé al inventario de materiales' },
]

export default function LoginPage() {
  const navigate = useNavigate()
  const { isAuthenticated, isRestoring, setSession } = useAuth()
  const [email, setEmail]               = useState('')
  const [password, setPassword]         = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError]               = useState('')

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
    <div className="min-h-screen flex flex-col lg:flex-row">

      {/* ── Branding panel (left on desktop / top hero on mobile) ── */}
      <div className="lg:w-[46%] xl:w-[50%] bg-sidebar flex flex-col relative overflow-hidden">

        {/* Dot-grid background */}
        <div
          className="absolute inset-0 opacity-[0.04] pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
            backgroundSize: '30px 30px',
          }}
        />

        {/* Atmospheric glow blobs */}
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-sidebar-primary/25 blur-3xl pointer-events-none" />
        <div className="absolute top-[38%] -left-20 w-60 h-60 rounded-full bg-blue-400/10 blur-3xl pointer-events-none hidden lg:block" />
        <div className="absolute -bottom-36 right-6 w-72 h-72 rounded-full bg-sidebar-primary/12 blur-3xl pointer-events-none hidden lg:block" />

        {/* Logo bar — shared between breakpoints */}
        <div className="relative z-10 flex items-center gap-3 p-6 sm:p-8 lg:p-10 xl:p-12">
          <div className="w-9 h-9 lg:w-10 lg:h-10 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center shadow-lg shrink-0">
            <img
              src="/logo_macabi.png"
              alt="Macabi"
              className="w-5 h-5 lg:w-6 lg:h-6 object-contain brightness-0 invert"
            />
          </div>
          <div className="leading-none">
            <p className="font-bold text-sidebar-foreground text-sm lg:text-base tracking-wide">Macabi</p>
            <p className="text-sidebar-muted-foreground text-[10px] uppercase font-bold tracking-widest mt-0.5">
              Organización Hebrea Argentina
            </p>
          </div>
        </div>

        {/* ── Mobile hero (below logo bar) ── */}
        <div className="lg:hidden flex flex-col items-center text-center px-8 pt-2 pb-16 flex-1">
          {/* Large logo bubble */}
          <div className="w-20 h-20 rounded-3xl bg-white/10 border border-white/15 shadow-2xl flex items-center justify-center mb-5">
            <img
              src="/logo_macabi.png"
              alt="Macabi"
              className="w-12 h-12 object-contain brightness-0 invert"
            />
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight leading-none mb-2.5">Bienvenido</h1>
          <p className="text-sm text-sidebar-muted-foreground leading-relaxed max-w-[260px]">
            La plataforma para madrijim y coordinadores de Macabi Argentina
          </p>

          {/* Feature icon row */}
          <div className="flex items-center gap-4 mt-8">
            {features.map(({ icon: Icon, label }) => (
              <div key={label} className="flex flex-col items-center gap-2">
                <div className="w-11 h-11 rounded-2xl bg-white/8 border border-white/10 flex items-center justify-center">
                  <Icon className="w-5 h-5 text-white/65" />
                </div>
                <span className="text-[10px] text-sidebar-muted-foreground font-medium">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Desktop branding content ── */}
        <div className="hidden lg:flex flex-col flex-1 justify-center px-10 xl:px-14 pb-8">
          {/* Headline */}
          <div className="mb-10">
            <h1 className="text-4xl xl:text-[2.75rem] font-extrabold text-sidebar-foreground leading-[1.08] tracking-tight mb-4">
              Todo lo que<br />
              <span className="text-sidebar-primary">necesitás,</span><br />
              en un solo lugar.
            </h1>
            <p className="text-sm text-sidebar-muted-foreground leading-relaxed max-w-[320px]">
              Administrá comidas, reembolsos, materiales y asistencia de jornadas sin complicaciones.
            </p>
          </div>

          {/* Features — vertical list */}
          <div className="space-y-2">
            {features.map(({ icon: Icon, label, desc }) => (
              <div
                key={label}
                className="flex items-center gap-3.5 px-4 py-3 rounded-xl bg-white/5 border border-white/[0.07] hover:bg-white/8 hover:border-white/15 transition-all duration-200 group cursor-default"
              >
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0 group-hover:bg-sidebar-primary/30 transition-colors">
                  <Icon className="w-4 h-4 text-white/75" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-sidebar-foreground leading-none mb-0.5">{label}</p>
                  <p className="text-xs text-sidebar-muted-foreground">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Copyright — desktop */}
        <div className="hidden lg:block relative z-10 px-10 xl:px-14 pb-8">
          <p className="text-[11px] text-sidebar-muted-foreground/50">
            © {new Date().getFullYear()} Macabi Argentina · Plataforma Madrijim
          </p>
        </div>
      </div>

      {/* ── Form panel (right on desktop / bottom on mobile) ── */}
      <div className="flex-1 flex flex-col bg-background rounded-t-3xl lg:rounded-none -mt-6 lg:mt-0 relative z-10 shadow-[0_-10px_40px_rgba(0,0,0,0.10)] lg:shadow-none border-t border-border/30 lg:border-t-0 lg:bg-muted/25">

        {/* Drag handle (mobile only) */}
        <div className="lg:hidden flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/15" />
        </div>

        {/* Centering wrapper */}
        <div className="flex-1 flex items-start lg:items-center justify-center px-6 lg:px-12 xl:px-16 pt-8 pb-10 lg:py-8">
          <div className="w-full max-w-sm">

            {/* Form card shell — elevated card only on desktop */}
            <div className="lg:bg-card lg:border lg:border-border/60 lg:shadow-[0_8px_40px_rgba(0,0,0,0.07)] lg:rounded-2xl lg:p-8 space-y-6">

              {/* Form header */}
              <div>
                {/* Subtle "secure access" divider — desktop only */}
                <div className="hidden lg:flex items-center gap-2 mb-5">
                  <div className="h-px flex-1 bg-border/70" />
                  <div className="flex items-center gap-1.5 px-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary/50" />
                    <span className="text-[10px] font-bold text-muted-foreground/70 uppercase tracking-widest">Acceso seguro</span>
                    <div className="w-1.5 h-1.5 rounded-full bg-primary/50" />
                  </div>
                  <div className="h-px flex-1 bg-border/70" />
                </div>

                <h2 className="text-2xl font-bold tracking-tight text-foreground">Iniciar sesión</h2>
                <p className="text-muted-foreground text-sm mt-1">
                  Ingresá tus credenciales para acceder a la plataforma
                </p>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4">

                {/* Email */}
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
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

                {/* Password */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
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
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-11 pr-10 rounded-xl focus-visible:ring-primary/20 focus-visible:border-primary border-border bg-card lg:bg-background"
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
                  <div className="text-xs text-destructive bg-destructive/8 rounded-xl px-4 py-3 border border-destructive/20 animate-shake">
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

              {/* Fine print */}
              <p className="text-xs text-muted-foreground text-center leading-relaxed max-w-[270px] mx-auto">
                El acceso es exclusivo para madrijim invitados. Si necesitás una cuenta, contactá al coordinador de tu sede.
              </p>
            </div>
          </div>
        </div>

        {/* Desktop copyright */}
        <div className="hidden lg:block px-12 xl:px-16 pb-8">
          <p className="text-[11px] text-muted-foreground/40">
            © {new Date().getFullYear()} Macabi Argentina · Todos los derechos reservados
          </p>
        </div>
      </div>
    </div>
  )
}
