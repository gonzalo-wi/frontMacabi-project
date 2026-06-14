import { useMutation } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PasswordInput } from '@/components/PasswordInput'
import { Label } from '@/components/ui/label'
import { ArrowLeft, CheckCircle2, KeyRound, Loader2 } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'

import { ApiError } from '@/lib/api/apiClient'
import { confirmPasswordReset } from '@/lib/api/auth'

export default function RestablecerContrasenaPage() {
  const [searchParams] = useSearchParams()
  const token = useMemo(() => (searchParams.get('token') ?? '').trim(), [searchParams])

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')

  const resetMutation = useMutation({
    mutationFn: () =>
      confirmPasswordReset({
        token,
        new_password: password,
      }),
    onError: (err: unknown) => {
      const message =
        err instanceof ApiError ? err.message : 'No se pudo actualizar la contraseña'
      setError(message)
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!token) {
      setError('Este enlace no es válido. Pedí uno nuevo desde la pantalla de inicio de sesión.')
      return
    }
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres')
      return
    }
    if (password !== confirm) {
      setError('Las contraseñas no coinciden')
      return
    }
    resetMutation.mutate()
  }

  const isLoading = resetMutation.isPending

  if (resetMutation.isSuccess) {
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
          <h2 className="text-2xl font-bold tracking-tight mb-2">Contraseña actualizada</h2>
          <p className="text-muted-foreground text-sm mb-8 leading-relaxed">
            {resetMutation.data?.message ?? 'Ya podés iniciar sesión con tu nueva contraseña.'}
          </p>
          <Link to="/">
            <Button className="w-full h-11 font-semibold">Ir al inicio de sesión</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex">
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

        <div className="relative z-10 space-y-6">
          <div className="w-24 h-24 rounded-3xl bg-white/10 border border-white/12 flex items-center justify-center shadow-2xl">
            <KeyRound className="w-12 h-12 text-sidebar-foreground" aria-hidden />
          </div>
          <div>
            <h1 className="text-4xl font-extrabold text-sidebar-foreground leading-[1.15] tracking-tight">
              Nueva<br />contraseña.
            </h1>
            <p className="mt-4 text-sm text-sidebar-muted-foreground leading-relaxed max-w-xs">
              Elegí una contraseña segura de al menos 8 caracteres para tu cuenta.
            </p>
          </div>
        </div>

        <div className="relative z-10">
          <p className="text-xs text-sidebar-muted-foreground/60">
            © {new Date().getFullYear()} Macabi Argentina · Plataforma Madrijim
          </p>
        </div>
      </div>

      <div className="flex-1 flex flex-col bg-background">
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

        <div className="flex-1 flex items-center justify-center px-6 lg:px-16 py-8">
          <div className="w-full max-w-sm">
            <Link
              to="/recuperar-password"
              className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors mb-10"
            >
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              Volver
            </Link>

            <div className="w-11 h-11 mb-6 rounded-xl bg-primary/10 border border-primary/15 flex items-center justify-center">
              <KeyRound className="w-5 h-5 text-primary" />
            </div>

            <h2 className="text-2xl font-bold tracking-tight mb-1.5">Restablecer contraseña</h2>
            <p className="text-muted-foreground text-sm mb-8 leading-relaxed">
              Ingresá tu nueva contraseña dos veces para confirmarla.
            </p>

            {!token && (
              <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2.5 border border-destructive/20 mb-6">
                Este enlace no es válido o está incompleto.{' '}
                <Link to="/recuperar-password" className="underline font-medium text-primary">
                  Solicitar un nuevo enlace
                </Link>
              </p>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="new-password" className="text-sm font-medium">
                  Nueva contraseña
                </Label>
                <PasswordInput
                  id="new-password"
                  show={showPassword}
                  onToggleShow={() => setShowPassword((s) => !s)}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11"
                  autoComplete="new-password"
                  disabled={isLoading || !token}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirm-password" className="text-sm font-medium">
                  Confirmar contraseña
                </Label>
                <Input
                  id="confirm-password"
                  type={showPassword ? 'text' : 'password'}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="h-11"
                  autoComplete="new-password"
                  disabled={isLoading || !token}
                />
              </div>

              {error && (
                <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2.5 border border-destructive/20">
                  {error}
                </p>
              )}

              <Button type="submit" className="w-full h-11 font-semibold" disabled={isLoading || !token}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  'Guardar contraseña'
                )}
              </Button>
            </form>
          </div>
        </div>

        <div className="hidden lg:block px-16 pb-8">
          <p className="text-xs text-muted-foreground/60">© {new Date().getFullYear()} Macabi Argentina</p>
        </div>
      </div>
    </div>
  )
}
