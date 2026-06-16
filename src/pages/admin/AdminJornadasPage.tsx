import { Link } from 'react-router-dom'
import { CalendarRange, Plus } from 'lucide-react'
import { toast } from 'sonner'

import { PageHeader } from '@/components/PageHeader'
import { ActionButton } from '@/components/ActionButton'
import { DataToolbar } from '@/components/data/DataToolbar'
import { MobileList } from '@/components/data/MobileList'
import { PaginationControls } from '@/components/data/PaginationControls'
import { SortableTable } from '@/components/data/SortableTable'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CreateJornadaDialog } from '@/features/events/components/admin/CreateJornadaDialog'
import { DuplicateJornadaDialog } from '@/features/events/components/admin/DuplicateJornadaDialog'
import { JornadaActionsMenu } from '@/features/events/components/admin/JornadaActionsMenu'
import { EventStatusBadge } from '@/features/events/components/EventStatusBadge'
import {
  useAdminJornadasPage,
  type JornadaStatusFilter,
} from '@/features/events/hooks/useAdminJornadasPage'
import type { EventInstanceDTO } from '@/features/events/model/types'
import { formatStartsAR } from '@/features/events/lib/deadline'
import { ApiError } from '@/lib/api/apiClient'
import { useAuth } from '@/hooks/useAuth'

export default function AdminJornadasPage() {
  const { token, isRestoring } = useAuth()

  const {
    statusFilter,
    setStatusFilter,
    createOpen,
    setCreateOpen,
    cancelTarget,
    setCancelTarget,
    deleteTarget,
    setDeleteTarget,
    pendingId,
    dupSeedId,
    setDupSeedId,
    page,
    setPage,
    search,
    setSearch,
    rows,
    totalPages,
    listQ,
    patchStatus,
    deleteMut,
    emptyMessage,
    confirmCancel,
    confirmDelete,
  } = useAdminJornadasPage({ token, isRestoring })

  function renderActions(row: EventInstanceDTO) {
    return (
      <JornadaActionsMenu
        row={row}
        pendingId={pendingId}
        onDuplicate={() => { setDupSeedId(row.id) }}
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
          <ActionButton intent="primary" onClick={() => { setCreateOpen(true) }}>
            <Plus className="w-4 h-4 mr-1" />
            Nueva jornada
          </ActionButton>
        }
      />

      <div className="p-4 lg:p-6 max-w-4xl mx-auto space-y-4">

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
              ? `${listQ.data.total} jornada${listQ.data.total === 1 ? '' : 's'}`
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
          rows={rows}
          columns={[
            {
              id: 'title',
              header: 'Jornada',
              render: (row) => (
                <Link to={`/app/admin/jornadas/${row.id}`} className="font-semibold text-primary hover:underline">
                  {row.title}
                </Link>
              ),
            },
            {
              id: 'starts_at',
              header: 'Inicio',
              render: (row) => <span className="text-xs text-muted-foreground">{formatStartsAR(row.starts_at)}</span>,
            },
            {
              id: 'status',
              header: 'Estado',
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
          isLoading={listQ.isLoading}
          emptyMessage={emptyMessage}
        />

        <MobileList
          rows={rows}
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

      <ConfirmDialog
        open={Boolean(cancelTarget)}
        onOpenChange={(o) => { if (!o) setCancelTarget(null) }}
        title={`¿Cancelar "${cancelTarget?.title}"?`}
        description="La jornada quedará cancelada y los participantes ya no podrán enviar respuestas. Esta acción se puede revertir desde el editor de la jornada."
        cancelLabel="Volver"
        confirmLabel="Cancelar jornada"
        destructive
        onConfirm={confirmCancel}
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
        onConfirm={confirmDelete}
      />

      <DuplicateJornadaDialog
        open={Boolean(dupSeedId)}
        seedId={dupSeedId}
        token={token ?? ''}
        onOpenChange={(o) => { if (!o) setDupSeedId(null) }}
        onDuplicated={() => toast.success('Copia en borrador lista.')}
        onError={(msg) => toast.error(msg)}
      />

      <CreateJornadaDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        token={token ?? ''}
        onCreated={() => toast.success('Jornada creada.')}
        onError={(msg) => toast.error(msg)}
      />
    </div>
  )
}
