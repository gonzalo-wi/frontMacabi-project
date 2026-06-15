import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CheckCircle2, Loader2, Mail } from 'lucide-react'
import { Link } from 'react-router-dom'

import { AuthPageLayout, AuthSuccessLayout } from '@/layouts/AuthPageLayout'
import { ApiError } from '@/lib/api/apiClient'
import { requestPasswordReset } from '@/lib/api/auth'

export default function RecuperarPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')

  const forgotMutation = useMutation({
    mutationFn: () => requestPasswordReset({ email: email.trim() }),
    onError: (err: unknown) => {
      const message = err instanceof ApiError ? err.message : 'No se pudo enviar la solicitud'
      setError(message)
    },
  })

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

    forgotMutation.mutate()
  }

  const isLoading = forgotMutation.isPending

  if (forgotMutation.isSuccess) {
    return (
      <AuthSuccessLayout
        icon={
          <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-success/10 border border-success/20 flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8 text-success" />
          </div>
        }
        title="Solicitud registrada"
        message={
          <>
            {forgotMutation.data?.message ??
              'Si el email está registrado, te enviamos un enlace para restablecer la contraseña.'}
            {email.trim() ? (
              <span className="block mt-4 text-xs">
                Pedido para <span className="font-medium text-foreground">{email.trim()}</span>
              </span>
            ) : null}
          </>
        }
        action={
          <Link to="/">
            <Button className="w-full h-11 font-semibold">Volver al inicio</Button>
          </Link>
        }
        footer={
          <p className="mt-5 text-xs text-muted-foreground">
            ¿No recibiste el email? Revisá tu carpeta de spam o{' '}
            <button
              type="button"
              onClick={() => forgotMutation.reset()}
              className="text-primary hover:underline font-medium"
            >
              intentá de nuevo
            </button>
          </p>
        }
      />
    )
  }

  return (
    <AuthPageLayout
      backLink={{ to: '/', label: 'Volver al inicio' }}
      icon={<Mail className="w-5 h-5 text-primary" />}
      title="Recuperar contraseña"
      subtitle="Ingresá tu email y te enviaremos un link para restablecer tu contraseña"
      heroVisual={
        <img
          src="/logo_macabi.png"
          alt=""
          aria-hidden="true"
          className="w-14 h-14 object-contain brightness-0 invert"
        />
      }
      heroTitle={
        <>
          Recuperá
          <br />
          tu acceso.
        </>
      }
      heroSubtitle="Ingresá tu email y te enviaremos instrucciones para restablecer tu contraseña."
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-sm font-medium">
            Email
          </Label>
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
    </AuthPageLayout>
  )
}
