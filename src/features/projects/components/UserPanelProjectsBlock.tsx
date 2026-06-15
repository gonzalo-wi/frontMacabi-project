import { Link } from 'react-router-dom'
import { Loader2, Users, Receipt, PackageOpen } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { labelProjectRole } from '@/features/projects/lib/projectLabels'
import type { MyProjectMembership } from '@/features/projects/lib/myMembership'
import { cn } from '@/lib/utils'

type Props = {
  memberships: MyProjectMembership[] | undefined
  isLoading: boolean
  className?: string
}

/**
 * Lista de proyectos donde el usuario es miembro.
 */
export function UserPanelProjectsBlock({ memberships, isLoading, className }: Props) {
  return (
    <Card className={cn('shadow-premium border-border/65 rounded-2xl overflow-hidden', className)}>
      <CardHeader className="flex flex-row items-center gap-3.5 space-y-0 pb-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Users className="h-5 w-5" aria-hidden />
        </div>
        <div className="min-w-0 space-y-0.5">
          <CardTitle className="text-base font-extrabold tracking-tight">Tus proyectos</CardTitle>
          <CardDescription className="text-xs leading-none">
            Equipos donde estás como coordinador o madrijím.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        {isLoading && (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}
        {!isLoading && (memberships?.length ?? 0) === 0 && (
          <p className="text-sm text-muted-foreground py-2 text-center border border-dashed rounded-xl bg-muted/10">
            Todavía no figuras en ningún equipo. Cuando un coordinador te agregue, aparecerá acá.
          </p>
        )}
        {memberships?.map((p) => {
          const isCoord = p.role === 'coordinator'
          const gastosTo = isCoord ? `/app/gastos?tab=proyecto&proj=${p.id}` : `/app/gastos?project=${p.id}`
          const stockTo  = isCoord ? `/app/stock?tab=proyecto&proj=${p.id}` : `/app/stock?project=${p.id}`
          return (
          <div
            key={p.id}
            className="rounded-xl border border-border/70 bg-card p-4 shadow-sm hover:border-primary/25 hover:scale-[1.01] active:scale-[0.99] transition-all duration-200 select-none group"
          >
            <div className="flex items-start justify-between gap-3">
              <span className="font-bold text-sm text-foreground leading-snug group-hover:text-primary transition-colors">{p.name}</span>
              <Badge 
                variant="secondary" 
                className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary border-transparent shrink-0"
              >
                {labelProjectRole(p.role)}
              </Badge>
            </div>
            {p.description && (
              <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 mt-2">{p.description}</p>
            )}
            <div className="mt-4 flex flex-wrap gap-2.5">
              <Link
                to={gastosTo}
                className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-border/80 px-3 text-xs font-semibold hover:bg-primary/5 hover:text-primary hover:border-primary/20 transition-all select-none cursor-pointer active:scale-95"
              >
                <Receipt className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary" />
                Ver gastos
              </Link>
              <Link
                to={stockTo}
                className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-border/80 px-3 text-xs font-semibold hover:bg-primary/5 hover:text-primary hover:border-primary/20 transition-all select-none cursor-pointer active:scale-95"
              >
                <PackageOpen className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary" />
                Ver pedidos
              </Link>
            </div>
          </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
