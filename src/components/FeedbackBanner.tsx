import { cn } from '@/lib/utils'

type FeedbackVariant = 'success' | 'error' | 'info'

export function FeedbackBanner({
  message,
  variant = 'info',
  className,
}: {
  message: string
  variant?: FeedbackVariant
  className?: string
}) {
  if (!message) return null
  return (
    <p
      role="status"
      className={cn(
        'text-sm rounded-md px-3 py-2 border',
        variant === 'success' &&
          'bg-emerald-500/[0.08] border-emerald-600/25 text-emerald-950 dark:text-emerald-100',
        variant === 'error' && 'bg-destructive/10 border-destructive/30 text-destructive',
        variant === 'info' && 'bg-muted/40 border-border text-foreground',
        className,
      )}
    >
      {message}
    </p>
  )
}
