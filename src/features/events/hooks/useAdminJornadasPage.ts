import { useState } from 'react'
import { toast } from 'sonner'
import { useMutation, useQueryClient } from '@tanstack/react-query'

import {
  deleteEventInstance,
  getEventDetail,
  patchEventInstance,
} from '@/features/events/api/eventsApi'
import { useAdminJornadas } from '@/features/events/hooks/useAdminJornadas'
import type { EventInstanceDTO } from '@/features/events/model/types'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { queryKeys } from '@/lib/queryKeys'

export type JornadaStatusFilter = 'all' | 'draft' | 'open' | 'closed' | 'cancelled'

type Args = {
  token: string | null
  isRestoring: boolean
}

export function useAdminJornadasPage({ token, isRestoring }: Args) {
  const qc = useQueryClient()
  const [statusFilter, setStatusFilter] = useState<JornadaStatusFilter>('all')
  const [createOpen, setCreateOpen] = useState(false)
  const [cancelTarget, setCancelTarget] = useState<EventInstanceDTO | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<EventInstanceDTO | null>(null)
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [dupSeedId, setDupSeedId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const debouncedQ = useDebouncedValue(search.trim())
  const resetKey = `${debouncedQ}|${statusFilter}`
  const [prevResetKey, setPrevResetKey] = useState(resetKey)
  if (resetKey !== prevResetKey) {
    setPrevResetKey(resetKey)
    setPage(1)
  }

  const listQ = useAdminJornadas(token, page, debouncedQ, statusFilter, isRestoring)

  const rows = listQ.data?.data ?? []
  const totalPages = listQ.data?.total_pages ?? 1

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
      toast.success('Estado actualizado.')
      await qc.invalidateQueries({ queryKey: queryKeys.events.adminListRoot() })
    },
    onError: (e) => {
      setPendingId(null)
      toast.error(e instanceof Error ? e.message : 'Error al actualizar')
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
      toast.success('Jornada eliminada.')
      await qc.invalidateQueries({ queryKey: queryKeys.events.adminListRoot() })
    },
    onError: (e) => {
      setPendingId(null)
      setDeleteTarget(null)
      toast.error(e instanceof Error ? e.message : 'Error al eliminar')
    },
  })

  const emptyMessage =
    search || statusFilter !== 'all'
      ? 'No hay jornadas para los filtros seleccionados.'
      : 'Todavía no hay jornadas. Usá "Nueva jornada" para crear la primera.'

  function confirmCancel() {
    if (cancelTarget) {
      patchStatus.mutate({ id: cancelTarget.id, status: 'cancelled' })
      setCancelTarget(null)
    }
  }

  function confirmDelete() {
    if (deleteTarget) deleteMut.mutate(deleteTarget.id)
  }

  return {
    token,
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
  }
}
