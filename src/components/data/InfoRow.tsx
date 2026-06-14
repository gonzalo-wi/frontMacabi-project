import type { LucideIcon } from 'lucide-react'

/** Fila etiqueta/valor con ícono, para las cards de detalle. */
export function InfoRow({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 py-3">
      <div className="h-7 w-7 shrink-0 rounded-lg bg-muted/50 flex items-center justify-center mt-0.5">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      </div>
      <div className="flex-1 flex items-start justify-between gap-4 min-w-0">
        <span className="text-sm text-muted-foreground shrink-0">{label}</span>
        <span className="text-sm font-medium text-right break-words max-w-[55%]">{value}</span>
      </div>
    </div>
  )
}
