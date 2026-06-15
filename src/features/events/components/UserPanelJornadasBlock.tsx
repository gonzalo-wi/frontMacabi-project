import { Link } from 'react-router-dom'
import { CalendarDays, ChevronRight, Loader2, ArrowRight } from 'lucide-react'
import type { UseQueryResult } from '@tanstack/react-query'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { DeadlineBadge } from '@/features/events/components/DeadlineBadge'
import { EventStatusBadge } from '@/features/events/components/EventStatusBadge'
import type { EventDetailDTO } from '@/features/events/model/types'
import { formatStartsAR, isBeforeDeadline } from '@/features/events/lib/deadline'
import { labelInstanceType } from '@/features/events/lib/eventLabels'
import type { UserRelevantUpcomingResult } from '@/features/events/hooks/useUserRelevantUpcomingEvents'
import { ApiError } from '@/lib/api/apiClient'
import { cn } from '@/lib/utils'

type ResponseStateMap = Map<string, boolean | undefined>

const panelBadgeCls = 'rounded-full border px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider leading-tight shrink-0'

function responderLink(id: string) {
  return `/app/jornadas/${id}/responder`
}

function ResponseStateBadge(opts: {
  instance: EventDetailDTO['instance']
  responded: boolean | undefined
}) {
  const { instance, responded } = opts
  const canRespond = instance.status === 'open' && isBeforeDeadline(instance.response_deadline_at)

  if (responded === undefined) {
    return (
      <span className={cn(panelBadgeCls, 'border-border bg-muted text-muted-foreground')}>…</span>
    )
  }
  if (responded) {
    return (
      <span className={cn(panelBadgeCls, 'border-emerald-200/80 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-900/50')}>
        Respondido
      </span>
    )
  }
  if (canRespond) {
    return (
      <span className={cn(panelBadgeCls, 'border-amber-200/85 bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-900/50 animate-pulse')}>
        Pendiente
      </span>
    )
  }
  return <span className={cn(panelBadgeCls, 'border-border bg-muted/50 text-muted-foreground')}>Sin respuesta</span>
}

function eventRow(opts: { d: EventDetailDTO; responseMap: ResponseStateMap }) {
  const { d, responseMap } = opts
  const inst = d.instance
  const responded = responseMap.get(inst.id)

  return (
    <Link
      to={responderLink(inst.id)}
      className={cn(
        'flex flex-col gap-2 rounded-xl border border-border/75 bg-card px-4 py-3 sm:flex-row sm:items-center sm:justify-between',
        'shadow-sm hover:border-primary/25 hover:scale-[1.01] active:scale-[0.99] transition-all duration-200 select-none group',
      )}
    >
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-bold text-sm leading-snug text-foreground group-hover:text-primary transition-colors truncate">{inst.title}</span>
          <EventStatusBadge status={inst.status} />
          <ResponseStateBadge instance={inst} responded={responded} />
        </div>
        <p className="text-xs text-muted-foreground">
          {labelInstanceType(inst.type)} · {formatStartsAR(inst.starts_at)}
        </p>
      </div>
      <ChevronRight className="h-4.5 w-4.5 shrink-0 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all hidden sm:block" aria-hidden />
    </Link>
  )
}

type Props = {
  upcomingQ: UseQueryResult<UserRelevantUpcomingResult, Error>
  responseMap: ResponseStateMap
  className?: string
}

/**
 * Lista + tarjeta destacada de próximas jornadas (estética alineada al resto del sistema: claro, borde acento).
 */
export function UserPanelJornadasBlock({ upcomingQ, responseMap, className }: Props) {
  const events = upcomingQ.data?.events ?? []
  const hero = events[0]
  const rest = events.slice(1)
  const hasMore = upcomingQ.data?.hasMore ?? false

  const heroResponded = hero ? responseMap.get(hero.instance.id) : undefined
  const heroCanRespond =
    hero &&
    hero.instance.status === 'open' &&
    isBeforeDeadline(hero.instance.response_deadline_at)

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-0.5 min-w-0">
          <h2 className="text-base font-extrabold tracking-tight text-foreground">Próximas jornadas</h2>
          <p className="text-xs text-muted-foreground max-w-xl leading-relaxed">
            Vas a ver acá las fechas donde participan tus proyectos y si ya enviaste respuesta.
          </p>
        </div>
      </div>

      {upcomingQ.isError && (
        <p className="text-sm text-destructive bg-destructive/10 rounded-xl px-4 py-3 border border-destructive/20">
          {upcomingQ.error instanceof ApiError ? upcomingQ.error.message : 'Error al cargar jornadas'}
        </p>
      )}

      {upcomingQ.isPending && (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {!upcomingQ.isPending && !upcomingQ.isError && events.length === 0 && (
        <Card className="border-dashed border-border/80 bg-muted/5">
          <CardContent className="py-10 text-center text-xs text-muted-foreground px-4 leading-relaxed max-w-sm mx-auto">
            No hay jornadas abiertas próximas vinculadas a tus proyectos. Cuando un coordinador las publique para tu equipo, van a aparecer acá.
          </CardContent>
        </Card>
      )}

      {hero && (
        <Card className="overflow-hidden border border-primary/25 rounded-2xl shadow-premium bg-gradient-to-br from-primary/10 via-primary/[0.03] to-card relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl pointer-events-none" />
          <CardContent className="p-0">
            <div className="flex flex-col gap-4 p-5 sm:p-6 border-l-[4px] border-l-primary relative z-10">
              <div className="flex gap-4 items-start">
                <div
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary shadow-sm"
                  aria-hidden
                >
                  <CalendarDays className="h-5.5 w-5.5" />
                </div>
                <div className="min-w-0 flex-1 space-y-2.5">
                  <div className="space-y-1">
                    <span className="text-[9px] font-bold text-primary tracking-widest uppercase leading-none block">Próxima Actividad</span>
                    <h3 className="text-base font-extrabold text-foreground leading-snug tracking-tight">{hero.instance.title}</h3>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <EventStatusBadge status={hero.instance.status} />
                    <ResponseStateBadge instance={hero.instance} responded={heroResponded} />
                    <Badge variant="outline" className="text-[9px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-background border-border/70 text-muted-foreground">
                      {labelInstanceType(hero.instance.type)}
                    </Badge>
                  </div>
                  <p className="text-xs font-medium text-muted-foreground">
                    Inicio: <span className="text-foreground font-semibold">{formatStartsAR(hero.instance.starts_at)}</span>
                  </p>
                  <div className="pt-0.5">
                    <DeadlineBadge responseDeadlineAt={hero.instance.response_deadline_at} />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-4 border-t border-border/50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between bg-card/65 backdrop-blur-xs relative z-10">
              <p className="text-xs text-muted-foreground leading-relaxed max-w-sm sm:max-w-md">
                {heroResponded === undefined
                  ? 'Cargando estado de tu respuesta…'
                  : heroResponded && !heroCanRespond
                    ? 'Ya cargaste tu respuesta para esta jornada.'
                    : heroResponded && heroCanRespond
                      ? 'Podés revisar o ajustar tu respuesta hasta la fecha límite.'
                      : heroCanRespond
                        ? 'Tenés una respuesta pendiente. Recordá cargarla antes del límite.'
                        : 'El plazo cerró o esta jornada no admite cambios desde acá.'}
              </p>
              <Button size="sm" className="sm:shrink-0 rounded-xl font-bold cursor-pointer active:scale-95 shadow-sm transition-transform" asChild>
                <Link to={responderLink(hero.instance.id)}>
                  {heroResponded === false && heroCanRespond
                    ? 'Responder'
                    : heroResponded
                      ? 'Ver respuesta'
                      : heroCanRespond
                        ? 'Responder'
                        : 'Abrir'}
                  <ArrowRight className="w-3.5 h-3.5 ml-1.5" aria-hidden />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {rest.length > 0 && (
        <div className="space-y-2.5 pt-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Otras próximas fechas</p>
          <div className="space-y-2">
            {rest.map((d) => (
              <div key={d.instance.id}>{eventRow({ d, responseMap })}</div>
            ))}
          </div>
        </div>
      )}

      {hasMore && (
        <p className="text-[11px] text-center text-muted-foreground/80 py-1 bg-muted/10 border border-dashed rounded-xl">
          Hay más jornadas vinculadas a tus proyectos que no entran en esta vista resumida.
        </p>
      )}
    </div>
  )
}
