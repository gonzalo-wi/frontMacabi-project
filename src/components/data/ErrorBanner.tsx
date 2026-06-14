import { cn } from '@/lib/utils'

/** Caja de error estándar para fallos de carga/acción (estilo destructive). */
export function ErrorBanner({ message, className }: { message: string; className?: string }) {
  return (
    <div
      className={cn(
        'rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive',
        className,
      )}
    >
      {message}
    </div>
  )
}
