import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { KeyRound, Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AuthPageLayout } from '@/layouts/AuthPageLayout'
import { ApiError } from '@/lib/api/apiClient'
import { acceptInvitation } from '@/lib/api/auth'

export default function AceptarInvitacionPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''
  const navigate = useNavigate()

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')

  const mutation = useMutation({
    mutationFn: () => acceptInvitation({ token: token.trim(), password }),
    onSuccess: () => {
      navigate('/', { replace: true })
    },
    onError: (err: unknown) => {
      const message =
        err instanceof ApiError ? err.message : 'No se pudo completar el registro'
      setError(message)
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!token.trim()) {
      setError('El link de invitación no es válido. Pedile uno nuevo a un administrador.')
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
    mutation.mutate()
  }

  const isLoading = mutation.isPending

  return (
    <AuthPageLayout
      backLink={{ to: '/', label: 'Volver al inicio' }}
      icon={<KeyRound className="w-5 h-5 text-primary" />}
      title="Aceptar invitación"
      subtitle="Completá el registro con tu contraseña. El link que recibiste por correo es de un solo uso."
      heroVisual={<KeyRound className="w-10 h-10 text-sidebar-foreground/90" aria-hidden />}
      heroTitle={
        <>
          Creá tu
          <br />
          cuenta.
        </>
      }
      heroSubtitle="Elegí una contraseña segura para activar tu acceso a la plataforma."
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-1.5">
          <Label htmlFor="password" className="text-sm font-medium">
            Contraseña
          </Label>
          <Input
            id="password"
            type="password"
            placeholder="Mínimo 8 caracteres"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-11"
            autoComplete="new-password"
            disabled={isLoading}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="confirm" className="text-sm font-medium">
            Confirmar contraseña
          </Label>
          <Input
            id="confirm"
            type="password"
            placeholder="Repetí la contraseña"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="h-11"
            autoComplete="new-password"
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
              Creando cuenta...
            </>
          ) : (
            'Activar cuenta'
          )}
        </Button>
      </form>
    </AuthPageLayout>
  )
}
