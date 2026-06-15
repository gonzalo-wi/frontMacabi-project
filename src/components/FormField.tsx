import type { ReactNode } from 'react'

import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

/**
 * Campo de formulario estándar: Label + control + hint opcional.
 * Unifica el patrón `space-y-1.5 + Label + Input/Select/Textarea` de todos los forms.
 */
export function FormField({
  label,
  htmlFor,
  required,
  hint,
  className,
  children,
}: {
  label: ReactNode
  htmlFor?: string
  required?: boolean
  hint?: string
  className?: string
  children: ReactNode
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <Label
        htmlFor={htmlFor}
        className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
      >
        {label}
        {required && <span className="ml-1 text-destructive">*</span>}
      </Label>
      {children}
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  )
}
