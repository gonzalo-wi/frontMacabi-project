import { Link } from 'react-router-dom'
import { Loader2, Users } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { labelProjectRole } from '@/features/events/lib/eventLabels'
import type { MyProjectMembership } from '@/features/projects/lib/myMembership'
import { cn } from '@/lib/utils'

type Props = {
  memberships: MyProjectMembership[] | undefined
  isLoading: boolean
  className?: string
}

/**
 * Lista de proyectos donde el usuario es miembro (sin enlaces admin).
 */
export function UserPanelProjectsBlock({ memberships, isLoading, className }: Props) {
  return (
    <Card className={cn('shadow-sm', className)}>
      <CardHeader className="flex flex-row items-start gap-3 space-y-0 pb-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <Users className="h-4 w-4" aria-hidden />
        </div>
        <div className="min-w-0 space-y-0.5">
          <CardTitle className="text-sm font-semibold">Tus proyectos</CardTitle>
          <CardDescription className="text-xs leading-relaxed">
            Equipos donde estás como coordinador o madrijím.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 pt-0">
        {isLoading && (
          <div className="flex justify-center py-5">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}
        {!isLoading && (memberships?.length ?? 0) === 0 && (
          <p className="text-sm text-muted-foreground py-1">
            Todavía no figuras en ningún equipo. Cuando un coordinador te agregue, va a aparecer acá.
          </p>
        )}
        {memberships?.map((p) => (
          <div key={p.id} className="rounded-lg border bg-card px-3 py-2.5 shadow-xs">
            <div className="flex items-start justify-between gap-2">
              <span className="font-medium text-sm text-foreground leading-snug">{p.name}</span>
              <Badge variant="outline" className="text-[10px] font-semibold uppercase tracking-wide shrink-0">
                {labelProjectRole(p.role)}
              </Badge>
            </div>
            {p.description && (
              <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 mt-2">{p.description}</p>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              <Link
                to={`/app/gastos?project=${p.id}`}
                className="inline-flex h-8 items-center rounded-md border px-3 text-xs font-medium hover:bg-muted"
              >
                Ver gastos
              </Link>
              <Link
                to={`/app/stock?project=${p.id}`}
                className="inline-flex h-8 items-center rounded-md border px-3 text-xs font-medium hover:bg-muted"
              >
                Ver pedidos
              </Link>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
