import type * as React from 'react'
import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

type PasswordInputProps = Omit<React.ComponentProps<typeof Input>, 'type'> & {
  /** Modo controlado: si se pasa `show`, el toggle lo maneja el padre vía `onToggleShow`. */
  show?: boolean
  onToggleShow?: () => void
}

/**
 * Campo de contraseña con toggle mostrar/ocultar.
 * Por defecto maneja su propio estado; pasá `show`/`onToggleShow` para controlarlo
 * (p.ej. cuando dos campos comparten un mismo toggle).
 */
export function PasswordInput({ className, show: showProp, onToggleShow, ...props }: PasswordInputProps) {
  const [showInternal, setShowInternal] = useState(false)
  const controlled = showProp !== undefined
  const show = controlled ? showProp : showInternal
  const toggle = controlled ? onToggleShow : () => setShowInternal((s) => !s)

  return (
    <div className="relative">
      <Input type={show ? 'text' : 'password'} className={cn('pr-10', className)} {...props} />
      <button
        type="button"
        onClick={toggle}
        tabIndex={-1}
        aria-label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  )
}
