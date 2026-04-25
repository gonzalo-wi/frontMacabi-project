import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ArrowLeft, Loader2, Mail, CheckCircle2 } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function RecuperarPasswordPage() {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!email) {
      setError('Por favor ingresá tu email')
      return
    }

    if (!email.includes('@')) {
      setError('Por favor ingresá un email válido')
      return
    }

    setIsLoading(true)
    await new Promise(resolve => setTimeout(resolve, 2000))
    setIsLoading(false)
    setIsSuccess(true)
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background">
        <div className="w-full max-w-sm text-center">
          <div className="flex items-center justify-center gap-2 mb-10">
            <div className="w-9 h-9 rounded-xl bg-sidebar flex items-center justify-center">
              <img src="/logo_macabi.png" alt="" className="w-5 h-5 object-contain brightness-0 invert" />
            </div>
            <span className="font-bold text-base">Macabi</span>
          </div>
          <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-success/10 border border-success/20 flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8 text-success" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight mb-2">¡Email enviado!</h2>
          <p className="text-muted-foreground text-sm mb-8 leading-relaxed">
            Revisá tu casilla de correo. Te enviamos un link para restablecer tu contraseña a{' '}
            <span className="font-medium text-foreground">{email}</span>
          </p>
          <Link to="/">
            <Button className="w-full h-11 font-semibold">Volver al inicio</Button>
          </Link>
          <p className="mt-5 text-xs text-muted-foreground">
            ¿No recibiste el email? Revisá tu carpeta de spam o{' '}
            <button
              onClick={() => setIsSuccess(false)}
              className="text-primary hover:underline font-medium"
            >
              intentá de nuevo
            </button>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex">
      {/* ── Left panel (desktop only) ── */}
      <div className="hidden lg:flex lg:w-[46%] xl:w-[50%] bg-sidebar flex-col justify-between p-10 relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.04] pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(circle, white 1.5px, transparent 1.5px)',
            backgroundSize: '28px 28px',
          }}
        />
        <div className="absolute -top-32 -right-32 w-80 h-80 rounded-full bg-sidebar-primary/8 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -left-32 w-80 h-80 rounded-full bg-sidebar-primary/6 blur-3xl pointer-events-none" />

        {/* Top: brand */}
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

        {/* Center: message */}
        <div className="relative z-10 space-y-6">
          <div className="w-24 h-24 rounded-3xl bg-white/10 border border-white/12 flex items-center justify-center shadow-2xl">
            <img
              src="/logo_macabi.png"
              alt=""
              aria-hidden="true"
              className="w-14 h-14 object-contain brightness-0 invert"
            />
          </div>
          <div>
            <h1 className="text-4xl font-extrabold text-sidebar-foreground leading-[1.15] tracking-tight">
              Recuperá<br />tu acceso.
            </h1>
            <p className="mt-4 text-sm text-sidebar-muted-foreground leading-relaxed max-w-xs">
              Ingresá tu email y te enviaremos instrucciones para restablecer tu contraseña.
            </p>
          </div>
        </div>

        {/* Bottom */}
        <div className="relative z-10">
          <p className="text-xs text-sidebar-muted-foreground/60">
            © {new Date().getFullYear()} Macabi Argentina · Plataforma Madrijim
          </p>
        </div>
      </div>

      {/* ── Right form panel ── */}
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

        {/* Form */}
        <div className="flex-1 flex items-center justify-center px-6 lg:px-16 py-8">
          <div className="w-full max-w-sm">

            <Link
              to="/"
              className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors mb-10"
            >
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              Volver al inicio
            </Link>

            <div className="w-11 h-11 mb-6 rounded-xl bg-primary/10 border border-primary/15 flex items-center justify-center">
              <Mail className="w-5 h-5 text-primary" />
            </div>

            <h2 className="text-2xl font-bold tracking-tight mb-1.5">Recuperar contraseña</h2>
            <p className="text-muted-foreground text-sm mb-8 leading-relaxed">
              Ingresá tu email y te enviaremos un link para restablecer tu contraseña
            </p>

            <form onSubmit={handleSubmit} className="space-y-5">
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

              {error && (
                <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2.5 border border-destructive/20">
                  {error}
                </p>
              )}

              <Button type="submit" className="w-full h-11 font-semibold" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  'Enviar link de recuperación'
                )}
              </Button>
            </form>

            <p className="mt-8 text-xs text-muted-foreground text-center leading-relaxed">
              Si no recordás tu email,{' '}
              <span className="text-foreground font-medium">contactá a tu coordinador</span>
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
