import { Skeleton } from '@/components/ui/skeleton'

/** Skeleton de carga para las páginas de detalle (banner + info + acciones). */
export function DetailSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-32 rounded-2xl" />
      <Skeleton className="h-52 rounded-2xl opacity-70" />
      <Skeleton className="h-24 rounded-2xl opacity-50" />
    </div>
  )
}
