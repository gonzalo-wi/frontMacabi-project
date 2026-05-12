import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { FileText, MoreVertical, SquarePen } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { EventStatusBadge } from '@/features/events/components/EventStatusBadge'
import { formatStartsAR } from '@/features/events/lib/deadline'
import { loadEventDetailsForProject } from '@/features/projects/lib/projectAdminQueries'
import { useAuth } from '@/hooks/useAuth'

export default function ProyectoJornadasPage() {
  const { id: projectId } = useParams<{ id: string }>()
  const { token, isRestoring } = useAuth()
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const eventsQ = useQuery({
    queryKey: ['project-linked-events', projectId, token],
    enabled: Boolean(token && projectId) && !isRestoring,
    queryFn: () => loadEventDetailsForProject(token!, projectId!),
  })

  const filteredEvents = useMemo(() => {
    let rows = eventsQ.data ?? []
    if (dateFrom) {
      const t = new Date(`${dateFrom}T00:00:00`).getTime()
      rows = rows.filter((d) => new Date(d.instance.starts_at).getTime() >= t)
    }
    if (dateTo) {
      const t = new Date(`${dateTo}T23:59:59`).getTime()
      rows = rows.filter((d) => new Date(d.instance.starts_at).getTime() <= t)
    }
    return [...rows].sort(
      (a, b) =>
        new Date(b.instance.starts_at).getTime() - new Date(a.instance.starts_at).getTime(),
    )
  }, [eventsQ.data, dateFrom, dateTo])

  const upcomingInFilter = useMemo(() => {
    const ref = new Date()
    return filteredEvents.filter(
      (d) =>
        d.instance.status !== 'cancelled' &&
        new Date(d.instance.starts_at).getTime() > ref.getTime(),
    ).length
  }, [filteredEvents])

  const nextGlobalLinked = useMemo(() => {
    const ref = new Date()
    const future = (eventsQ.data ?? []).filter(
      (d) =>
        d.instance.status !== 'cancelled' &&
        new Date(d.instance.starts_at).getTime() > ref.getTime(),
    )
    future.sort(
      (a, b) =>
        new Date(a.instance.starts_at).getTime() - new Date(b.instance.starts_at).getTime(),
    )
    return future[0] ?? null
  }, [eventsQ.data])

  const hasAnyLinkedEvents = (eventsQ.data?.length ?? 0) > 0

  if (!projectId) return null

  return (
    <div className="space-y-6">
      {!eventsQ.isLoading && nextGlobalLinked && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Próxima jornada</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold">{nextGlobalLinked.instance.title}</span>
              <EventStatusBadge status={nextGlobalLinked.instance.status} />
            </div>
            <p className="text-sm text-muted-foreground">
              {formatStartsAR(nextGlobalLinked.instance.starts_at)}
            </p>
            <Button size="sm" variant="secondary" asChild>
              <Link to={`/app/admin/jornadas/${nextGlobalLinked.instance.id}`}>
                Ver ficha de la jornada
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <CardTitle className="text-base">Todas las jornadas vinculadas</CardTitle>
          <div className="flex flex-wrap gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Desde</Label>
              <Input
                type="date"
                className="h-9"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Hasta</Label>
              <Input
                type="date"
                className="h-9"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {eventsQ.isLoading && (
            <div className="space-y-2">
              <div className="h-14 bg-muted/40 rounded animate-pulse" />
              <div className="h-14 bg-muted/40 rounded animate-pulse opacity-60" />
            </div>
          )}
          {!eventsQ.isLoading && filteredEvents.length > 0 && (
            <p className="text-xs text-muted-foreground pb-2">
              {filteredEvents.length} resultado{filteredEvents.length === 1 ? '' : 's'}
              {!dateFrom && !dateTo ? ` (${upcomingInFilter} futura${upcomingInFilter === 1 ? '' : 's'})` : ''}.
            </p>
          )}
          {filteredEvents.map((d) => (
            <div
              key={d.instance.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2"
            >
              <div>
                <p className="font-medium">{d.instance.title}</p>
                <p className="text-xs text-muted-foreground">{formatStartsAR(d.instance.starts_at)}</p>
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                <EventStatusBadge status={d.instance.status} />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      aria-label={`Acciones: ${d.instance.title}`}
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link to={`/app/admin/jornadas/${d.instance.id}`}>
                        <FileText />
                        Ver ficha
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to={`/app/admin/jornadas/${d.instance.id}/editar`}>
                        <SquarePen />
                        Editar formulario
                      </Link>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}
          {!eventsQ.isLoading && filteredEvents.length === 0 && (
            <p className="text-sm text-muted-foreground py-4 text-center">
              {hasAnyLinkedEvents
                ? dateFrom || dateTo
                  ? 'No hay jornadas en ese rango de fechas.'
                  : 'No hay jornadas vinculadas a este proyecto.'
                : 'Este proyecto no está vinculado a ninguna jornada.'}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
