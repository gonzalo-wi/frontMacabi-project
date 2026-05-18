import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  CalendarRange,
  Copy,
  FileText,
  Loader2,
  Lock,
  LockOpen,
  MoreVertical,
  Plus,
  SquarePen,
  Trash2,
  XOctagon,
} from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { FeedbackBanner } from '@/components/FeedbackBanner'
import { PageHeader } from '@/components/PageHeader'
import { ActionButton, ActionIconButton } from '@/components/ActionButton'
import { DataToolbar } from '@/components/admin/DataToolbar'
import { MobileList } from '@/components/admin/MobileList'
import { PaginationControls } from '@/components/admin/PaginationControls'
import { SortableTable, type SortDirection } from '@/components/admin/SortableTable'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  createEventInstance,
  deleteEventInstance,
  duplicateEventFromDetail,
  getEventDetail,
  listEventInstances,
  patchEventInstance,
  type DuplicateEventOverrides,
} from '@/features/events/api/eventsApi'
import { EventStatusBadge } from '@/features/events/components/EventStatusBadge'
import type { EventDetailDTO, EventInstanceDTO } from '@/features/events/model/types'
import { formatStartsAR } from '@/features/events/lib/deadline'
import { labelInstanceStatus } from '@/features/events/lib/eventLabels'
import {
  addCalendarDaysToIso,
  fromDatetimeLocalValue,
  newDeadlinePreservingOffset,
  toDatetimeLocalValue,
} from '@/features/events/lib/datetimeLocal'
import { ApiError } from '@/lib/api/apiClient'
import { useAuth } from '@/hooks/useAuth'

type FeedbackState = { text: string; variant: 'success' | 'error' | 'info' } | null
type JornadaSortKey = 'title' | 'starts_at' | 'status'
type JornadaStatusFilter = 'all' | 'draft' | 'open' | 'closed' | 'cancelled'

const PAGE_SIZE = 20

async function fetchAllEventInstances(token: string): Promise<EventInstanceDTO[]> {
  const out: EventInstanceDTO[] = []
  let page = 1
  while (page <= 50) {
    const result = await listEventInstances(token, page, 50)
    out.push(...result.data)
    if (page >= result.total_pages) break
    page++
  }
  return out
}

function JornadaActionsMenu({
  row,
  pendingId,
  onDuplicate,
  onOpen,
  onClose,
  onCancelRequest,
  onDeleteRequest,
}: {
  row: EventInstanceDTO
  pendingId: string | null
  onDuplicate: () => void
  onOpen: () => void
  onClose: () => void
  onCancelRequest: () => void
  onDeleteRequest: () => void
}) {
  const ficha = `/app/admin/jornadas/${row.id}`
  const editar = `/app/admin/jornadas/${row.id}/editar`
  const isThisRowPending = pendingId === row.id
  const canToggleOpen = row.status !== 'open' && row.status !== 'cancelled'
  const showClose = row.status === 'open'
  const canCancel = row.status !== 'cancelled'

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <ActionIconButton
          type="button"
          intent="secondary"
          label={`Acciones: ${row.title}`}
        >
          {isThisRowPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <MoreVertical className="h-4 w-4" />
          )}
        </ActionIconButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[13rem]">
        <DropdownMenuItem asChild>
          <Link to={ficha}>
            <FileText />
            Ver ficha
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to={editar}>
            <SquarePen />
            Editar formulario
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem disabled={isThisRowPending} onClick={onDuplicate}>
          <Copy />
          Duplicar
        </DropdownMenuItem>

        {(canToggleOpen || showClose || canCancel) && <DropdownMenuSeparator />}

        {canToggleOpen && (
          <DropdownMenuItem disabled={isThisRowPending} onClick={onOpen}>
            <LockOpen />
            Abrir respuestas
          </DropdownMenuItem>
        )}
        {showClose && (
          <DropdownMenuItem disabled={isThisRowPending} onClick={onClose}>
            <Lock />
            Cerrar respuestas
          </DropdownMenuItem>
        )}
        {canCancel && (
          <DropdownMenuItem
            variant="destructive"
            disabled={isThisRowPending}
            onClick={onCancelRequest}
          >
            <XOctagon />
            Cancelar jornada
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator />

        <DropdownMenuItem
          variant="destructive"
          disabled={isThisRowPending}
          onClick={onDeleteRequest}
        >
          <Trash2 />
          Eliminar jornada
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default function AdminJornadasPage() {
  const { token, isRestoring } = useAuth()
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<JornadaStatusFilter>('all')
  const [sortKey, setSortKey] = useState<JornadaSortKey>('starts_at')
  const [sortDir, setSortDir] = useState<SortDirection>('desc')
  const [createOpen, setCreateOpen] = useState(false)
  const [title, setTitle] = useState('Nueva jornada')
  const [startsLocal, setStartsLocal] = useState('')
  const [deadlineLocal, setDeadlineLocal] = useState('')
  const [statusDraft, setStatusDraft] = useState('draft')
  const [feedback, setFeedback] = useState<FeedbackState>(null)
  const [cancelTarget, setCancelTarget] = useState<EventInstanceDTO | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<EventInstanceDTO | null>(null)
  const [pendingId, setPendingId] = useState<string | null>(null)

  const [dupDialogOpen, setDupDialogOpen] = useState(false)
  const [dupSeedId, setDupSeedId] = useState<string | null>(null)
  const [dupTitle, setDupTitle] = useState('')
  const [dupStartsLocal, setDupStartsLocal] = useState('')
  const [dupDeadlineLocal, setDupDeadlineLocal] = useState('')
  const dupInitializedRef = useRef<string | null>(null)

  const listQ = useQuery({
    queryKey: ['admin-events', token],
    enabled: Boolean(token) && !isRestoring,
    queryFn: () => fetchAllEventInstances(token!),
  })

  const dupDetailQ = useQuery({
    queryKey: ['admin-event-detail-dup', dupSeedId],
    enabled: Boolean(token) && !isRestoring && Boolean(dupSeedId) && dupDialogOpen,
    queryFn: () => getEventDetail(token!, dupSeedId!),
  })

  const createMut = useMutation({
    mutationFn: async () => {
      if (!startsLocal) throw new Error('Indicá fecha y hora de inicio')
      await createEventInstance(token!, {
        title,
        starts_at: fromDatetimeLocalValue(startsLocal),
        response_deadline_at: deadlineLocal ? fromDatetimeLocalValue(deadlineLocal) : null,
        status: statusDraft,
        type: 'activity',
      })
    },
    onSuccess: async () => {
      setFeedback({ text: 'Jornada creada.', variant: 'success' })
      setCreateOpen(false)
      await qc.invalidateQueries({ queryKey: ['admin-events'] })
    },
    onError: (e) =>
      setFeedback({
        text: e instanceof Error ? e.message : 'Error al crear',
        variant: 'error',
      }),
  })

  const dupMut = useMutation({
    mutationFn: async (args: { detail: EventDetailDTO; overrides: DuplicateEventOverrides }) => {
      setPendingId(args.detail.instance.id)
      const { newId } = await duplicateEventFromDetail(token!, args.detail, args.overrides)
      return newId
    },
    onSuccess: async () => {
      setPendingId(null)
      setDupDialogOpen(false)
      setDupSeedId(null)
      dupInitializedRef.current = null
      setFeedback({ text: 'Copia en borrador lista.', variant: 'success' })
      await qc.invalidateQueries({ queryKey: ['admin-events'] })
    },
    onError: (e) => {
      setPendingId(null)
      setFeedback({
        text: e instanceof Error ? e.message : 'Error al duplicar',
        variant: 'error',
      })
    },
  })

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
      setFeedback({
        text: e instanceof Error ? e.message : 'Error al actualizar',
        variant: 'error',
      })
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
      setFeedback({
        text: e instanceof Error ? e.message : 'Error al eliminar',
        variant: 'error',
      })
    },
  })

  useEffect(() => {
    if (!dupDialogOpen) return
    const data = dupDetailQ.data
    if (!data?.instance || data.instance.id !== dupSeedId) return
    if (dupInitializedRef.current === dupSeedId) return

    const inst = data.instance
    const newStartIso = addCalendarDaysToIso(inst.starts_at, 7)
    setDupStartsLocal(toDatetimeLocalValue(newStartIso))
    setDupTitle(`${inst.title} (copia)`)
    if (inst.response_deadline_at) {
      setDupDeadlineLocal(
        toDatetimeLocalValue(
          newDeadlinePreservingOffset(inst.starts_at, inst.response_deadline_at, newStartIso),
        ),
      )
    } else {
      setDupDeadlineLocal('')
    }
    dupInitializedRef.current = dupSeedId
  }, [dupDialogOpen, dupSeedId, dupDetailQ.data])

  function openDuplicate(row: EventInstanceDTO) {
    setFeedback(null)
    dupInitializedRef.current = null
    setDupSeedId(row.id)
    setDupDialogOpen(true)
  }

  function onDupStartsChange(v: string) {
    setDupStartsLocal(v)
    const d = dupDetailQ.data
    if (!d?.instance.response_deadline_at || !v) return
    const inst = d.instance
    const dlIso = newDeadlinePreservingOffset(
      inst.starts_at,
      inst.response_deadline_at!,
      fromDatetimeLocalValue(v),
    )
    setDupDeadlineLocal(toDatetimeLocalValue(dlIso))
  }

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
    const rows = (listQ.data ?? []).filter((row) => {
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

  const totalPages = Math.max(1, Math.ceil(filteredSorted.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const pageRows = filteredSorted.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  useEffect(() => {
    setPage(1)
  }, [search, statusFilter, sortKey, sortDir])

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
              ? `Mostrando ${filteredSorted.length} de ${listQ.data.length} jornada${listQ.data.length === 1 ? '' : 's'}`
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
          rows={pageRows}
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
              render: (row) => (
                <JornadaActionsMenu
                  row={row}
                  pendingId={pendingId}
                  onDuplicate={() => openDuplicate(row)}
                  onOpen={() => patchStatus.mutate({ id: row.id, status: 'open' })}
                  onClose={() => patchStatus.mutate({ id: row.id, status: 'closed' })}
                  onCancelRequest={() => setCancelTarget(row)}
                  onDeleteRequest={() => setDeleteTarget(row)}
                />
              ),
            },
          ]}
          getRowKey={(row) => row.id}
          sortKey={sortKey}
          sortDir={sortDir}
          onSort={handleSort}
          isLoading={listQ.isLoading}
          emptyMessage={
            search || statusFilter !== 'all'
              ? 'No hay jornadas para los filtros seleccionados.'
              : 'Todavía no hay jornadas. Usá "Nueva jornada" para crear la primera.'
          }
        />

        <MobileList
          rows={pageRows}
          getRowKey={(row) => row.id}
          isLoading={listQ.isLoading}
          emptyMessage={
            search || statusFilter !== 'all'
              ? 'No hay jornadas para los filtros seleccionados.'
              : 'Todavía no hay jornadas. Usá "Nueva jornada" para crear la primera.'
          }
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
              <JornadaActionsMenu
                row={row}
                pendingId={pendingId}
                onDuplicate={() => openDuplicate(row)}
                onOpen={() => patchStatus.mutate({ id: row.id, status: 'open' })}
                onClose={() => patchStatus.mutate({ id: row.id, status: 'closed' })}
                onCancelRequest={() => setCancelTarget(row)}
                onDeleteRequest={() => setDeleteTarget(row)}
              />
            </div>
          )}
        />

        <PaginationControls page={safePage} totalPages={totalPages} onPageChange={setPage} />
      </div>

      {/* Confirm cancel dialog */}
      <AlertDialog open={Boolean(cancelTarget)} onOpenChange={(o) => { if (!o) setCancelTarget(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Cancelar "{cancelTarget?.title}"?</AlertDialogTitle>
            <AlertDialogDescription>
              La jornada quedará cancelada y los participantes ya no podrán enviar respuestas. Esta acción
              se puede revertir desde el editor de la jornada.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Volver</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground"
              onClick={() => {
                if (cancelTarget) {
                  patchStatus.mutate({ id: cancelTarget.id, status: 'cancelled' })
                  setCancelTarget(null)
                }
              }}
            >
              Cancelar jornada
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(o) => !deleteMut.isPending && !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar "{deleteTarget?.title}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminarán el formulario, las preguntas y todas las respuestas. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMut.isPending}>Volver</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground"
              disabled={deleteMut.isPending}
              onClick={(e) => {
                e.preventDefault()
                if (deleteTarget) deleteMut.mutate(deleteTarget.id)
              }}
            >
              {deleteMut.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 inline animate-spin" />
                  Eliminando…
                </>
              ) : (
                'Eliminar definitivamente'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={dupDialogOpen}
        onOpenChange={(o: boolean) => {
          if (!o) {
            setDupDialogOpen(false)
            setDupSeedId(null)
            dupInitializedRef.current = null
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Duplicar jornada</DialogTitle>
            <p className="text-sm text-muted-foreground pt-1">
              Se copian el formulario, proyectos y preguntas. Elegí la nueva fecha de inicio; si había límite de
              respuestas, se desplaza el mismo margen respecto del inicio (podés ajustarlo).
            </p>
          </DialogHeader>
          {dupDetailQ.isLoading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
              <Loader2 className="h-4 w-4 animate-spin" />
              Cargando datos de la jornada…
            </div>
          )}
          {dupDetailQ.isError && (
            <p className="text-sm text-destructive py-2">
              {dupDetailQ.error instanceof ApiError ? dupDetailQ.error.message : 'No se pudo cargar la jornada'}
            </p>
          )}
          {dupDetailQ.data && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="dup-title">Título de la copia</Label>
                <Input
                  id="dup-title"
                  value={dupTitle}
                  onChange={(e) => setDupTitle(e.target.value)}
                  className="h-11"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="dup-starts">Inicio de la copia</Label>
                <Input
                  id="dup-starts"
                  type="datetime-local"
                  value={dupStartsLocal}
                  onChange={(e) => onDupStartsChange(e.target.value)}
                  className="h-11"
                />
                <p className="text-xs text-muted-foreground">
                  Por defecto: misma hora del original, una semana después.
                </p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="dup-deadline">Límite de respuestas (opcional)</Label>
                <Input
                  id="dup-deadline"
                  type="datetime-local"
                  value={dupDeadlineLocal}
                  onChange={(e) => setDupDeadlineLocal(e.target.value)}
                  className="h-11"
                />
              </div>
              <Button
                className="w-full"
                disabled={dupMut.isPending || !dupStartsLocal}
                onClick={() => {
                  if (!dupDetailQ.data || !dupStartsLocal) return
                  setFeedback(null)
                  dupMut.mutate({
                    detail: dupDetailQ.data,
                    overrides: {
                      title: dupTitle.trim() || undefined,
                      starts_at: fromDatetimeLocalValue(dupStartsLocal),
                      response_deadline_at: dupDeadlineLocal ? fromDatetimeLocalValue(dupDeadlineLocal) : null,
                    },
                  })
                }}
              >
                {dupMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Crear copia en borrador'}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nueva jornada</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="create-title">Título</Label>
              <Input
                id="create-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="h-11"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="create-starts">Inicio</Label>
              <Input
                id="create-starts"
                type="datetime-local"
                value={startsLocal}
                onChange={(e) => setStartsLocal(e.target.value)}
                className="h-11"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="create-deadline">Límite de respuestas (opcional)</Label>
              <Input
                id="create-deadline"
                type="datetime-local"
                value={deadlineLocal}
                onChange={(e) => setDeadlineLocal(e.target.value)}
                className="h-11"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Estado inicial</Label>
              <Select value={statusDraft} onValueChange={setStatusDraft}>
                <SelectTrigger className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">{labelInstanceStatus('draft')}</SelectItem>
                  <SelectItem value="open">{labelInstanceStatus('open')}</SelectItem>
                  <SelectItem value="closed">{labelInstanceStatus('closed')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              className="w-full"
              disabled={createMut.isPending}
              onClick={() => {
                setFeedback(null)
                createMut.mutate()
              }}
            >
              {createMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Crear jornada'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
