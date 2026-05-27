import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { CalendarRange, FileText, MoreVertical, SquarePen } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'

import { ActionButton, ActionIconButton } from '@/components/ActionButton'
import { PaginationControls } from '@/components/admin/PaginationControls'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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

  const [jornadasPage, setJornadasPage] = useState(1)
  useEffect(() => { setJornadasPage(1) }, [dateFrom, dateTo])
  const JORNADAS_PAGE_SIZE = 10
  const jornadasTotalPages = Math.max(1, Math.ceil(filteredEvents.length / JORNADAS_PAGE_SIZE))
  const pagedEvents = filteredEvents.slice((jornadasPage - 1) * JORNADAS_PAGE_SIZE, jornadasPage * JORNADAS_PAGE_SIZE)

  if (!projectId) return null

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* ── Próxima jornada ── */}
      {!eventsQ.isLoading && nextGlobalLinked && (
        <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/8 to-primary/3 p-4 sm:p-5 space-y-3 shadow-sm">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-primary/15 p-1.5 shrink-0">
              <CalendarRange className="h-3.5 w-3.5 text-primary" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-primary/80">
              Próxima jornada
            </span>
          </div>

          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1 min-w-0">
              <p className="font-bold text-base text-foreground leading-tight">
                {nextGlobalLinked.instance.title}
              </p>
              <p className="text-sm text-muted-foreground">
                {formatStartsAR(nextGlobalLinked.instance.starts_at)}
              </p>
            </div>
            <EventStatusBadge status={nextGlobalLinked.instance.status} />
          </div>

          <ActionButton intent="view" asChild size="sm">
            <Link to={`/app/admin/jornadas/${nextGlobalLinked.instance.id}`}>
              Ver ficha de la jornada
            </Link>
          </ActionButton>
        </div>
      )}

      {/* ── Listado completo ── */}
      <Card className="rounded-2xl shadow-sm overflow-hidden">
        <CardHeader className="px-4 sm:px-6 pt-4 sm:pt-5 pb-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <CalendarRange className="w-4 h-4 text-primary shrink-0" />
              Jornadas vinculadas
            </CardTitle>

            {/* Filtros de fecha */}
            <div className="flex flex-wrap items-end gap-2">
              <div className="space-y-1">
                <Label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Desde
                </Label>
                <Input
                  type="date"
                  className="h-8 text-xs w-36"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Hasta
                </Label>
                <Input
                  type="date"
                  className="h-8 text-xs w-36"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </div>
              {(dateFrom || dateTo) && (
                <button
                  type="button"
                  onClick={() => { setDateFrom(''); setDateTo('') }}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors h-8 flex items-center"
                >
                  Limpiar
                </button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="px-4 sm:px-6 pb-5 space-y-2">
          {/* Loading skeleton */}
          {eventsQ.isLoading && (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="h-16 bg-muted/40 rounded-xl animate-pulse"
                  style={{ opacity: 1 - i * 0.25 }}
                />
              ))}
            </div>
          )}

          {/* Contador de resultados */}
          {!eventsQ.isLoading && filteredEvents.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 pb-1">
              <span className="text-xs text-muted-foreground">
                {filteredEvents.length} resultado{filteredEvents.length !== 1 ? 's' : ''}
              </span>
              {!dateFrom && !dateTo && upcomingInFilter > 0 && (
                <Badge
                  variant="outline"
                  className="text-[10px] font-medium border-primary/30 text-primary bg-primary/5"
                >
                  {upcomingInFilter} futura{upcomingInFilter !== 1 ? 's' : ''}
                </Badge>
              )}
            </div>
          )}

          {/* Lista de jornadas */}
          {pagedEvents.map((d) => {
            const isPast = new Date(d.instance.starts_at).getTime() < Date.now()
            return (
              <div
                key={d.instance.id}
                className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 rounded-xl border border-border/70 bg-card px-4 py-3 hover:bg-muted/20 transition-colors"
              >
                <div className="min-w-0 flex-1 space-y-0.5">
                  <Link
                    to={`/app/admin/jornadas/${d.instance.id}`}
                    className="font-semibold text-primary hover:underline text-sm leading-tight block truncate"
                  >
                    {d.instance.title}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {formatStartsAR(d.instance.starts_at)}
                    {isPast && (
                      <span className="ml-1.5 text-muted-foreground/60">· pasada</span>
                    )}
                  </p>
                </div>

                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <EventStatusBadge status={d.instance.status} />
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <ActionIconButton
                        type="button"
                        intent="secondary"
                        label={`Acciones: ${d.instance.title}`}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </ActionIconButton>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link to={`/app/admin/jornadas/${d.instance.id}`}>
                          <FileText className="w-4 h-4" />
                          Ver ficha
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to={`/app/admin/jornadas/${d.instance.id}/editar`}>
                          <SquarePen className="w-4 h-4" />
                          Editar formulario
                        </Link>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            )
          })}

          <PaginationControls page={jornadasPage} totalPages={jornadasTotalPages} onPageChange={setJornadasPage} />

          {/* Vacío */}
          {!eventsQ.isLoading && filteredEvents.length === 0 && (
            <div className="flex flex-col items-center gap-2.5 py-10 text-center border border-dashed rounded-xl">
              <CalendarRange className="w-9 h-9 text-muted-foreground/25" />
              <p className="text-sm text-muted-foreground">
                {hasAnyLinkedEvents
                  ? dateFrom || dateTo
                    ? 'No hay jornadas en ese rango de fechas.'
                    : 'No hay jornadas vinculadas a este proyecto.'
                  : 'Este proyecto no está vinculado a ninguna jornada todavía.'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
