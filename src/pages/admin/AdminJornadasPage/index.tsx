import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarRange, Plus } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'

import { FeedbackBanner } from '@/components/FeedbackBanner'
import { useFeedback } from '@/hooks/useFeedback'
import { PageHeader } from '@/components/PageHeader'
import { ActionButton } from '@/components/ActionButton'
import { DataToolbar } from '@/components/data/DataToolbar'
import { MobileList } from '@/components/data/MobileList'
import { PaginationControls } from '@/components/data/PaginationControls'
import { SortableTable, type SortDirection } from '@/components/data/SortableTable'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  deleteEventInstance,
  getEventDetail,
  patchEventInstance,
} from '@/features/events/api/eventsApi'
import { EventStatusBadge } from '@/features/events/components/EventStatusBadge'
import { useAdminJornadas } from '@/features/events/hooks/useAdminJornadas'
import type { EventInstanceDTO } from '@/features/events/model/types'
import { formatStartsAR } from '@/features/events/lib/deadline'
import { labelInstanceStatus } from '@/features/events/lib/eventLabels'
import { ApiError } from '@/lib/api/apiClient'
import { useAuth } from '@/hooks/useAuth'

import { JornadaActionsMenu } from './JornadaActionsMenu'
import { CreateJornadaDialog } from './CreateJornadaDialog'
import { DuplicateJornadaDialog } from './DuplicateJornadaDialog'

type JornadaSortKey = 'title' | 'starts_at' | 'status'
type JornadaStatusFilter = 'all' | 'draft' | 'open' | 'closed' | 'cancelled'

export default function AdminJornadasPage() {
  const { token, isRestoring } = useAuth()
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<JornadaStatusFilter>('all')
  const [sortKey, setSortKey] = useState<JornadaSortKey>('starts_at')
  const [sortDir, setSortDir] = useState<SortDirection>('desc')
  const [createOpen, setCreateOpen] = useState(false)
  const { feedback, setFeedback } = useFeedback()

  const [cancelTarget, setCancelTarget] = useState<EventInstanceDTO | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<EventInstanceDTO | null>(null)
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [dupSeedId, setDupSeedId] = useState<string | null>(null)

  const listQ = useAdminJornadas(token, page, isRestoring)

  const patchStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      setPendingId(id)
      const cur = await getEventDetail(token!, id)
      const inst = cur.instance
      await patchEventInstance(token!, id, {
        title: inst.title,
        type: inst.type,
        starts_at: inst.starts_at,
        response_deadline_at: inst.response_deadline_at ?? null,
        status,
      })
    },
    onSuccess: async () => {
      setPendingId(null)
      setFeedback({ text: 'Estado actualizado.', variant: 'success' })
      await qc.invalidateQueries({ queryKey: ['admin-events'] })
    },
    onError: (e) => {
      setPendingId(null)
      setFeedback({ text: e instanceof Error ? e.message : 'Error al actualizar', variant: 'error' })
    },
  })

  const deleteMut = useMutation({
    mutationFn: async (eventId: string) => {
      setPendingId(eventId)
      await deleteEventInstance(token!, eventId)
    },
    onSuccess: async () => {
      setPendingId(null)
      setDeleteTarget(null)
      setFeedback({ text: 'Jornada eliminada.', variant: 'success' })
      await qc.invalidateQueries({ queryKey: ['admin-events'] })
    },
    onError: (e) => {
      setPendingId(null)
      setDeleteTarget(null)
      setFeedback({ text: e instanceof Error ? e.message : 'Error al eliminar', variant: 'error' })
    },
  })

  function handleSort(key: JornadaSortKey) {
    if (key === sortKey) {
      setSortDir((current) => (current === 'asc' ? 'desc' : 'asc'))
      return
    }
    setSortKey(key)
    setSortDir(key === 'starts_at' ? 'desc' : 'asc')
  }

  const filteredSorted = useMemo(() => {
    const term = search.trim().toLowerCase()
    const rows = (listQ.data?.data ?? []).filter((row) => {
      if (statusFilter !== 'all' && row.status !== statusFilter) return false
      if (!term) return true
      return row.title.toLowerCase().includes(term)
    })

    return [...rows].sort((a, b) => {
      let result = 0
      if (sortKey === 'title') result = a.title.localeCompare(b.title)
      if (sortKey === 'status') {
        result = labelInstanceStatus(a.status).localeCompare(labelInstanceStatus(b.status))
      }
      if (sortKey === 'starts_at') {
        result = new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()
      }
      return sortDir === 'asc' ? result : -result
    })
  }, [listQ.data, search, sortDir, sortKey, statusFilter])

  const totalPages = listQ.data?.total_pages ?? 1

  useEffect(() => {
    setPage(1)
  }, [search, statusFilter, sortKey, sortDir])

  const emptyMessage =
    search || statusFilter !== 'all'
      ? 'No hay jornadas para los filtros seleccionados.'
      : 'Todavía no hay jornadas. Usá "Nueva jornada" para crear la primera.'

  function renderActions(row: EventInstanceDTO) {
    return (
      <JornadaActionsMenu
        row={row}
        pendingId={pendingId}
        onDuplicate={() => { setFeedback(null); setDupSeedId(row.id) }}
        onOpen={() => patchStatus.mutate({ id: row.id, status: 'open' })}
        onClose={() => patchStatus.mutate({ id: row.id, status: 'closed' })}
        onCancelRequest={() => setCancelTarget(row)}
        onDeleteRequest={() => setDeleteTarget(row)}
      />
    )
  }

  return (
    <div className="min-h-screen pb-24">
      <PageHeader
        icon={CalendarRange}
        title="Jornadas"
        subtitle="Planificá actividades, abrí respuestas y revisá asistencia."
        action={
          <ActionButton intent="primary" onClick={() => { setFeedback(null); setCreateOpen(true) }}>
            <Plus className="w-4 h-4 mr-1" />
            Nueva jornada
          </ActionButton>
        }
      />

      <div className="p-4 lg:p-6 max-w-4xl mx-auto space-y-4">
        {feedback && <FeedbackBanner message={feedback.text} variant={feedback.variant} />}

        {listQ.isError && (
          <p className="text-sm text-destructive">
            {listQ.error instanceof ApiError ? listQ.error.message : 'Error al cargar las jornadas'}
          </p>
        )}

        <DataToolbar
          search={search}
          onSearch={setSearch}
          searchPlaceholder="Buscar jornada"
          countLabel={
            listQ.data
              ? `Mostrando ${filteredSorted.length} de ${listQ.data.total} jornada${listQ.data.total === 1 ? '' : 's'}`
              : undefined
          }
          filters={
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as JornadaStatusFilter)}>
              <SelectTrigger className="h-10 w-full sm:w-[13rem]">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="draft">Borrador</SelectItem>
                <SelectItem value="open">Abierta</SelectItem>
                <SelectItem value="closed">Respuestas cerradas</SelectItem>
                <SelectItem value="cancelled">Cancelada</SelectItem>
              </SelectContent>
            </Select>
          }
        />

        <SortableTable
          rows={filteredSorted}
          columns={[
            {
              id: 'title',
              header: 'Jornada',
              sortKey: 'title',
              render: (row) => (
                <Link to={`/app/admin/jornadas/${row.id}`} className="font-semibold text-primary hover:underline">
                  {row.title}
                </Link>
              ),
            },
            {
              id: 'starts_at',
              header: 'Inicio',
              sortKey: 'starts_at',
              render: (row) => <span className="text-xs text-muted-foreground">{formatStartsAR(row.starts_at)}</span>,
            },
            {
              id: 'status',
              header: 'Estado',
              sortKey: 'status',
              render: (row) => <EventStatusBadge status={row.status} />,
            },
            {
              id: 'actions',
              header: 'Acciones',
              headerClassName: 'text-right w-[1%] whitespace-nowrap',
              className: 'text-right',
              render: renderActions,
            },
          ]}
          getRowKey={(row) => row.id}
          sortKey={sortKey}
          sortDir={sortDir}
          onSort={handleSort}
          isLoading={listQ.isLoading}
          emptyMessage={emptyMessage}
        />

        <MobileList
          rows={filteredSorted}
          getRowKey={(row) => row.id}
          isLoading={listQ.isLoading}
          emptyMessage={emptyMessage}
          renderRow={(row) => (
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Link to={`/app/admin/jornadas/${row.id}`} className="font-semibold text-primary hover:underline">
                    {row.title}
                  </Link>
                  <EventStatusBadge status={row.status} />
                </div>
                <p className="text-xs text-muted-foreground">{formatStartsAR(row.starts_at)}</p>
              </div>
              {renderActions(row)}
            </div>
          )}
        />

        <PaginationControls page={page} totalPages={totalPages} onPageChange={setPage} />
      </div>

      {/* Confirmaciones */}
      <ConfirmDialog
        open={Boolean(cancelTarget)}
        onOpenChange={(o) => { if (!o) setCancelTarget(null) }}
        title={`¿Cancelar "${cancelTarget?.title}"?`}
        description="La jornada quedará cancelada y los participantes ya no podrán enviar respuestas. Esta acción se puede revertir desde el editor de la jornada."
        cancelLabel="Volver"
        confirmLabel="Cancelar jornada"
        destructive
        onConfirm={() => {
          if (cancelTarget) {
            patchStatus.mutate({ id: cancelTarget.id, status: 'cancelled' })
            setCancelTarget(null)
          }
        }}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(o) => !deleteMut.isPending && !o && setDeleteTarget(null)}
        title={`¿Eliminar "${deleteTarget?.title}"?`}
        description="Se eliminarán el formulario, las preguntas y todas las respuestas. Esta acción no se puede deshacer."
        cancelLabel="Volver"
        confirmLabel="Eliminar definitivamente"
        loadingLabel="Eliminando…"
        destructive
        loading={deleteMut.isPending}
        onConfirm={() => {
          if (deleteTarget) deleteMut.mutate(deleteTarget.id)
        }}
      />

      {/* Diálogos auto-contenidos */}
      <DuplicateJornadaDialog
        open={Boolean(dupSeedId)}
        seedId={dupSeedId}
        token={token ?? ''}
        onOpenChange={(o) => { if (!o) setDupSeedId(null) }}
        onDuplicated={() => setFeedback({ text: 'Copia en borrador lista.', variant: 'success' })}
        onError={(msg) => setFeedback({ text: msg, variant: 'error' })}
      />

      <CreateJornadaDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        token={token ?? ''}
        onCreated={() => setFeedback({ text: 'Jornada creada.', variant: 'success' })}
        onError={(msg) => setFeedback({ text: msg, variant: 'error' })}
      />
    </div>
  )
}
