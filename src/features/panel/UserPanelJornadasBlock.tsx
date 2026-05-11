import { Link } from 'react-router-dom'
import { CalendarDays, ChevronRight, Loader2 } from 'lucide-react'
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

const panelBadgeCls = 'rounded-full border px-2 py-0.5 text-[10px] font-semibold leading-tight shrink-0'

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
      <span className={cn(panelBadgeCls, 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-100 dark:border-emerald-800')}>
        Respondido
      </span>
    )
  }
  if (canRespond) {
    return (
      <span className={cn(panelBadgeCls, 'border-amber-200 bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-100')}>
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
        'flex flex-col gap-1.5 rounded-lg border bg-card px-3 py-3 sm:flex-row sm:items-center sm:justify-between',
        'shadow-xs hover:border-primary/35 hover:bg-muted/30 transition-colors',
      )}
    >
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium text-sm leading-snug text-foreground truncate">{inst.title}</span>
          <EventStatusBadge status={inst.status} />
          <ResponseStateBadge instance={inst} responded={responded} />
        </div>
        <p className="text-xs text-muted-foreground">
          {labelInstanceType(inst.type)} · {formatStartsAR(inst.starts_at)}
        </p>
      </div>
      <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground hidden sm:block" aria-hidden />
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
        <div className="space-y-1 min-w-0">
          <h2 className="text-base font-semibold tracking-tight text-foreground">Próximas jornadas</h2>
          <p className="text-sm text-muted-foreground max-w-xl">
            Vas a ver acá las fechas donde participan tus proyectos y si ya enviaste respuesta.
          </p>
        </div>
      </div>

      {upcomingQ.isError && (
        <p className="text-sm text-destructive">
          {upcomingQ.error instanceof ApiError ? upcomingQ.error.message : 'Error al cargar jornadas'}
        </p>
      )}

      {upcomingQ.isPending && (
        <div className="flex justify-center py-10">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {!upcomingQ.isPending && !upcomingQ.isError && events.length === 0 && (
        <Card className="border-dashed bg-muted/15">
          <CardContent className="py-10 text-center text-sm text-muted-foreground px-4">
            No hay jornadas abiertas próximas vinculadas a tus proyectos. Cuando un coordinador las
            publique para tu equipo, van a aparecer acá.
          </CardContent>
        </Card>
      )}

      {hero && (
        <Card className="overflow-hidden border shadow-sm">
          <CardContent className="p-0">
            <div className="flex flex-col gap-4 p-4 sm:p-5 border-l-[3px] border-l-primary bg-muted/20">
              <div className="flex gap-4 sm:items-start">
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
                  aria-hidden
                >
                  <CalendarDays className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-semibold text-foreground leading-snug">{hero.instance.title}</h3>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <EventStatusBadge status={hero.instance.status} />
                    <ResponseStateBadge instance={hero.instance} responded={heroResponded} />
                    <Badge variant="secondary" className="text-[10px] font-medium">
                      {labelInstanceType(hero.instance.type)}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">Inicio: {formatStartsAR(hero.instance.starts_at)}</p>
                  <DeadlineBadge responseDeadlineAt={hero.instance.response_deadline_at} />
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 border-t px-4 py-4 sm:flex-row sm:items-center sm:justify-between bg-card">
              <p className="text-sm text-muted-foreground">
                {heroResponded === undefined
                  ? 'Cargando estado de tu respuesta…'
                  : heroResponded && !heroCanRespond
                    ? 'Ya cargaste tu respuesta para esta jornada.'
                    : heroResponded && heroCanRespond
                      ? 'Podés revisar o ajustar tu respuesta hasta la fecha límite.'
                      : heroCanRespond
                        ? 'Podés cargar tu respuesta hasta la fecha límite.'
                        : 'El plazo cerró o esta jornada no admite cambios desde acá.'}
              </p>
              <Button size="sm" className="sm:shrink-0" asChild>
                <Link to={responderLink(hero.instance.id)}>
                  {heroResponded === false && heroCanRespond
                    ? 'Responder'
                    : heroResponded
                      ? 'Ver respuesta'
                      : heroCanRespond
                        ? 'Responder'
                        : 'Abrir'}
                  <ChevronRight className="w-4 h-4 ml-1" aria-hidden />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {rest.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Otras próximas fechas</p>
          <div className="space-y-2">
            {rest.map((d) => (
              <div key={d.instance.id}>{eventRow({ d, responseMap })}</div>
            ))}
          </div>
        </div>
      )}

      {hasMore && (
        <p className="text-xs text-center text-muted-foreground">
          Hay más jornadas vinculadas a tus proyectos que no entran en esta vista resumida.
        </p>
      )}
    </div>
  )
}
