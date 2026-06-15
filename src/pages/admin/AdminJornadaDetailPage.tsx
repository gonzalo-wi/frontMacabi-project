import { Link, useParams } from 'react-router-dom'
import {
  Calendar,
  CalendarRange,
  Clock,
  FolderOpen,
  Layers,
  MoreVertical,
  Pencil,
  Trash2,
} from 'lucide-react'

import { PageHeader } from '@/components/PageHeader'
import { ActionButton } from '@/components/ActionButton'
import { ErrorBanner } from '@/components/data/ErrorBanner'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ParticipantesSection } from '@/features/events/components/admin/ParticipantesSection'
import { ResultadosAgregadosCard } from '@/features/events/components/admin/ResultadosAgregadosCard'
import { EventStatusBadge } from '@/features/events/components/EventStatusBadge'
import { useAdminJornadaDetailPage } from '@/features/events/hooks/useAdminJornadaDetailPage'
import { labelInstanceType } from '@/features/events/lib/eventLabels'
import { formatStartsAR } from '@/features/events/lib/deadline'
import { ApiError } from '@/lib/api/apiClient'
import { useAuth } from '@/hooks/useAuth'

export default function AdminJornadaDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { token, isRestoring } = useAuth()

  const {
    deleteOpen,
    setDeleteOpen,
    detailQ,
    projectsQ,
    participantQ,
    summariesByModuleId,
    summariesLoading,
    deleteMut,
    totalResponses,
    inst,
    title,
    linkedNames,
    modCount,
  } = useAdminJornadaDetailPage({ id, token, isRestoring })

  if (!id) return null

  return (
    <div className="min-h-screen pb-24">
      <PageHeader
        icon={CalendarRange}
        title={title}
        subtitle="Ficha de jornada"
        action={
          <div className="flex flex-wrap gap-2 justify-end">
            <ActionButton intent="back" asChild>
              <Link to="/app/admin/jornadas">Volver</Link>
            </ActionButton>
            {inst && (
              <ActionButton intent="edit" asChild>
                <Link to={`/app/admin/jornadas/${id}/editar`}>
                  <Pencil className="w-4 h-4" />
                  Editar
                </Link>
              </ActionButton>
            )}
            {inst && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <ActionButton intent="secondary" disabled={deleteMut.isPending}>
                    <MoreVertical className="w-4 h-4" />
                    <span className="hidden sm:inline">Más</span>
                  </ActionButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive gap-2"
                    onClick={() => {
                      setDeleteOpen(true)
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                    Eliminar jornada
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        }
      />

      <div className="px-3 py-4 sm:px-4 lg:px-6 lg:py-6 max-w-4xl mx-auto space-y-4 sm:space-y-6">

        {detailQ.isError && (
          <ErrorBanner
            message={detailQ.error instanceof ApiError ? detailQ.error.message : 'Error al cargar la jornada'}
          />
        )}

        {detailQ.isLoading && (
          <div className="space-y-4">
            <div className="h-40 rounded-2xl bg-muted/50 animate-pulse" />
            <div className="h-28 rounded-2xl bg-muted/50 animate-pulse opacity-60" />
            <div className="h-28 rounded-2xl bg-muted/50 animate-pulse opacity-40" />
          </div>
        )}

        {inst && (
          <>
            <div className="rounded-2xl border bg-card overflow-hidden shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-5 pt-4 pb-3 sm:pt-5 sm:pb-4">
                <div className="flex flex-wrap items-center gap-2">
                  <EventStatusBadge status={inst.status} />
                  <Badge variant="secondary" className="text-xs font-normal">
                    {labelInstanceType(inst.type)}
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 border-t divide-border divide-x divide-y sm:divide-y-0">
                <div className="flex items-start gap-3 px-4 sm:px-5 py-4">
                  <div className="mt-0.5 rounded-lg bg-primary/10 p-1.5 shrink-0">
                    <Calendar className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-0.5">
                      Inicio
                    </p>
                    <p className="text-sm font-semibold text-foreground leading-tight">
                      {formatStartsAR(inst.starts_at)}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 px-4 sm:px-5 py-4">
                  <div className="mt-0.5 rounded-lg bg-primary/10 p-1.5 shrink-0">
                    <Clock className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-0.5">
                      Límite
                    </p>
                    <p className="text-sm font-semibold text-foreground leading-tight">
                      {inst.response_deadline_at
                        ? formatStartsAR(inst.response_deadline_at)
                        : 'Sin límite'}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 px-4 sm:px-5 py-4">
                  <div className="mt-0.5 rounded-lg bg-primary/10 p-1.5 shrink-0">
                    <Layers className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-0.5">
                      Módulos
                    </p>
                    <p className="text-2xl font-bold text-foreground leading-none">{modCount}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 px-4 sm:px-5 py-4">
                  <div className="mt-0.5 rounded-lg bg-primary/10 p-1.5 shrink-0">
                    <FolderOpen className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-0.5">
                      Proyectos
                    </p>
                    {projectsQ.isLoading ? (
                      <div className="h-4 w-20 bg-muted/50 rounded animate-pulse mt-1" />
                    ) : linkedNames.length === 0 ? (
                      <p className="text-sm font-semibold text-muted-foreground">Todos</p>
                    ) : (
                      <div className="flex flex-wrap gap-1 mt-0.5">
                        {linkedNames.map((name, i) => (
                          <Badge
                            key={i}
                            variant="outline"
                            className="text-[10px] font-normal px-1.5 py-0 h-4"
                          >
                            {name}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {participantQ.isSuccess && totalResponses > 0 && detailQ.data && (
              <ResultadosAgregadosCard
                modules={detailQ.data.modules}
                totalResponses={totalResponses}
                summariesByModuleId={summariesByModuleId}
                summariesLoading={summariesLoading}
              />
            )}

            <ParticipantesSection
              token={token!}
              eventId={id}
              detail={detailQ.data!}
              projects={projectsQ.data ?? []}
              participantResponses={participantQ.data?.data ?? []}
              participantPending={participantQ.isPending}
              participantIsError={participantQ.isError}
              participantError={participantQ.error}
              participantIsSuccess={participantQ.isSuccess}
            />
          </>
        )}
      </div>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={(o) => !deleteMut.isPending && setDeleteOpen(o)}
        title="¿Eliminar esta jornada?"
        description={`Se eliminará "${title}" por completo: proyectos vinculados al evento, bloques del formulario (módulos, grupos y opciones) y todas las respuestas de los participantes. Esta acción no se puede recuperar.`}
        confirmLabel="Eliminar definitivamente"
        loadingLabel="Eliminando…"
        destructive
        loading={deleteMut.isPending}
        onConfirm={() => deleteMut.mutate()}
      />
    </div>
  )
}
