import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

/** Filas skeleton para listas mientras cargan. Alto configurable vía `className` (default h-16). */
export function SkeletonRows({ count = 4, className }: { count?: number; className?: string }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn('h-16 rounded-xl', className)}
          style={{ opacity: 1 - i * 0.2 }}
        />
      ))}
    </div>
  )
}
