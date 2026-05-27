import { useIsFetching, useIsMutating } from '@tanstack/react-query'
import { cn } from '@/lib/utils'

/**
 * Thin progress bar fixed at the top of the viewport.
 * Appears automatically whenever TanStack Query has in-flight
 * fetches or mutations — no wiring needed at call sites.
 */
export function GlobalLoadingBar() {
  const isFetching = useIsFetching()
  const isMutating = useIsMutating()
  const isActive = isFetching > 0 || isMutating > 0

  return (
    <div
      role="status"
      aria-label="Cargando"
      aria-live="polite"
      aria-busy={isActive}
      className={cn(
        'fixed top-0 inset-x-0 z-[9999] h-[3px] pointer-events-none overflow-hidden',
        'transition-opacity duration-500',
        isActive ? 'opacity-100' : 'opacity-0',
      )}
    >
      {/* Subtle track */}
      <div className="absolute inset-0 bg-primary/15" />
      {/* Sliding glow */}
      <div className="absolute top-0 h-full w-[55%] animate-loading-bar bg-gradient-to-r from-transparent via-primary to-transparent" />
    </div>
  )
}
