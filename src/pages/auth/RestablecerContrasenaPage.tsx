import { useMutation } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PasswordInput } from '@/components/PasswordInput'
import { Label } from '@/components/ui/label'
import { CheckCircle2, KeyRound, Loader2 } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'

import { AuthPageLayout, AuthSuccessLayout } from '@/layouts/AuthPageLayout'
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
      <AuthSuccessLayout
        icon={
          <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-success/10 border border-success/20 flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8 text-success" />
          </div>
        }
        title="Contraseña actualizada"
        message={resetMutation.data?.message ?? 'Ya podés iniciar sesión con tu nueva contraseña.'}
        action={
          <Link to="/">
            <Button className="w-full h-11 font-semibold">Ir al inicio de sesión</Button>
          </Link>
        }
      />
    )
  }

  return (
    <AuthPageLayout
      backLink={{ to: '/recuperar-password', label: 'Volver' }}
      icon={<KeyRound className="w-5 h-5 text-primary" />}
      title="Restablecer contraseña"
      subtitle="Ingresá tu nueva contraseña dos veces para confirmarla."
      heroVisual={<KeyRound className="w-12 h-12 text-sidebar-foreground" aria-hidden />}
      heroTitle={
        <>
          Nueva
          <br />
          contraseña.
        </>
      }
      heroSubtitle="Elegí una contraseña segura de al menos 8 caracteres para tu cuenta."
    >
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
    </AuthPageLayout>
  )
}
