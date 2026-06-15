import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueries, useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import {
  getEventDetail,
  deleteEventInstance,
  listEventParticipantResponses,
  getModuleResponseSummary,
} from '@/features/events/api/eventsApi'
import type { ModuleResponseSummaryDTO } from '@/features/events/model/types'
import { fetchAllProjects } from '@/features/projects/api/projectsApi'
import { ApiError } from '@/lib/api/apiClient'
import { queryKeys } from '@/lib/queryKeys'

type Args = {
  id: string | undefined
  token: string | null
  isRestoring: boolean
}

export function useAdminJornadaDetailPage({ id, token, isRestoring }: Args) {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [deleteOpen, setDeleteOpen] = useState(false)

  const detailQ = useQuery({
    queryKey: queryKeys.events.detail(id, token),
    enabled: Boolean(token && id) && !isRestoring,
    queryFn: () => getEventDetail(token!, id!),
  })

  const projectsQ = useQuery({
    queryKey: queryKeys.projects.allP1(token),
    enabled: Boolean(token) && !isRestoring,
    queryFn: () => fetchAllProjects(token!),
  })

  const participantQ = useQuery({
    queryKey: queryKeys.events.participantResponses(id, token),
    enabled: Boolean(token && id) && !isRestoring && Boolean(detailQ.data?.instance),
    queryFn: () => listEventParticipantResponses(token!, id!),
  })

  const moduleIds = useMemo(
    () => (detailQ.data?.modules ?? []).map((md) => md.module.id),
    [detailQ.data],
  )

  const summaryQueries = useQueries({
    queries: moduleIds.map((moduleId) => ({
      queryKey: queryKeys.events.moduleSummary(moduleId, token),
      enabled: Boolean(token && moduleId) && !isRestoring && Boolean(detailQ.data),
      queryFn: () => getModuleResponseSummary(token!, moduleId),
    })),
  })

  const summariesByModuleId = useMemo(() => {
    const m = new Map<string, ModuleResponseSummaryDTO>()
    moduleIds.forEach((mid, i) => {
      const data = summaryQueries[i]?.data
      if (data) m.set(mid, data)
    })
    return m
  }, [moduleIds, summaryQueries])

  const summariesLoading = summaryQueries.length > 0 && summaryQueries.some((q) => q.isPending)

  const deleteMut = useMutation({
    mutationFn: () => {
      if (!token || !id) throw new Error('Sesión inválida')
      return deleteEventInstance(token, id)
    },
    onSuccess: async () => {
      setDeleteOpen(false)
      await qc.invalidateQueries({ queryKey: queryKeys.events.adminListRoot() })
      navigate('/app/admin/jornadas')
    },
    onError: (e) => {
      toast.error(e instanceof ApiError ? e.message : e instanceof Error ? e.message : 'No se pudo eliminar')
      setDeleteOpen(false)
    },
  })

  const totalResponses = participantQ.data?.data.length ?? 0
  const inst = detailQ.data?.instance
  const title = inst?.title ?? 'Jornada'
  const projectMap = new Map((projectsQ.data ?? []).map((p) => [p.id, p.name]))
  const linkedNames =
    detailQ.data?.project_ids.map((pid) => projectMap.get(pid) ?? pid.slice(0, 8) + '…') ?? []
  const modCount = detailQ.data?.modules.length ?? 0

  return {
    id,
    token,
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
  }
}
