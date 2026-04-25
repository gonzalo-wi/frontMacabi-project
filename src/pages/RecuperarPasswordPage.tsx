import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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

    // Simular envío de email
    await new Promise(resolve => setTimeout(resolve, 2000))

    setIsLoading(false)
    setIsSuccess(true)
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-primary/5 via-background to-accent/5">
        <Card className="w-full max-w-sm shadow-xl border-0 bg-card/80 backdrop-blur-sm">
          <CardContent className="pt-8 pb-6 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-success/10 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-success" />
            </div>
            <h2 className="text-xl font-semibold mb-2">¡Email enviado!</h2>
            <p className="text-muted-foreground text-sm mb-6">
              Revisá tu casilla de correo. Te enviamos un link para restablecer tu contraseña a <span className="font-medium text-foreground">{email}</span>
            </p>
            <Link to="/">
              <Button className="w-full">
                Volver al inicio
              </Button>
            </Link>
            <p className="mt-4 text-xs text-muted-foreground">
              ¿No recibiste el email? Revisá tu carpeta de spam o{' '}
              <button 
                onClick={() => setIsSuccess(false)}
                className="text-primary hover:underline"
              >
                intentá de nuevo
              </button>
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-primary/5 via-background to-accent/5">
      {/* Back button */}
      <div className="w-full max-w-sm mb-4">
        <Link
          to="/"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Volver
        </Link>
      </div>

      <Card className="w-full max-w-sm shadow-xl border-0 bg-card/80 backdrop-blur-sm">
        <CardHeader className="space-y-1 pb-4">
          <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-primary/10 flex items-center justify-center">
            <Mail className="w-6 h-6 text-primary" />
          </div>
          <CardTitle className="text-xl text-center">Recuperar contraseña</CardTitle>
          <CardDescription className="text-center">
            Ingresá tu email y te enviaremos un link para restablecer tu contraseña
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
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
              <p className="text-sm text-destructive text-center">{error}</p>
            )}

            <Button 
              type="submit" 
              className="w-full h-11 font-medium"
              disabled={isLoading}
            >
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
        </CardContent>
      </Card>

      <p className="mt-6 text-xs text-muted-foreground text-center max-w-xs">
        Si no recordás tu email, contactá a tu coordinador o administrador
      </p>
    </div>
  )
}
