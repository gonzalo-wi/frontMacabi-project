import { useCallback, useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  getEventDetail,
  getMyEventResponse,
  submitEventResponse,
} from '@/features/events/api/eventsApi'
import { isBeforeDeadline } from '@/features/events/lib/deadline'
import {
  findAttendanceGate,
  optionLabelIndicatesDecline,
} from '@/features/events/lib/attendanceGate'
import {
  collectAnswers,
  validateRequiredAnswers,
} from '@/features/events/lib/eventResponse'
import {
  defaultProjectIdForResponse,
  visibleModulesForUser,
} from '@/features/events/lib/visibility'
import { listProjects } from '@/features/projects/api/projectsApi'
import { fetchMyProjectMemberships } from '@/features/projects/lib/myMembership'
import { queryKeys } from '@/lib/queryKeys'

type UseEventRespondPageArgs = {
  eventId: string | undefined
  token: string | null
  userId: string | undefined
  isRestoring: boolean
}

export function useEventRespondPage({
  eventId,
  token,
  userId,
  isRestoring,
}: UseEventRespondPageArgs) {
  const qc = useQueryClient()

  const detailQuery = useQuery({
    queryKey: queryKeys.events.detail(eventId, token),
    enabled: Boolean(token && eventId) && !isRestoring,
    queryFn: () => getEventDetail(token!, eventId!),
  })

  const myMembershipsQuery = useQuery({
    queryKey: queryKeys.memberships.my(userId, token),
    enabled: Boolean(token && userId) && !isRestoring,
    queryFn: () => fetchMyProjectMemberships(token!, userId!),
  })

  const projectNamesQ = useQuery({
    queryKey: queryKeys.projects.nameMap(token),
    enabled: Boolean(token) && !isRestoring,
    queryFn: async () => {
      const map = new Map<string, string>()
      let pg = 1
      while (pg <= 20) {
        const r = await listProjects(token!, pg, 50)
        for (const p of r.data) map.set(p.id, p.name)
        if (pg >= r.total_pages) break
        pg++
      }
      return map
    },
  })

  const myProjectSet = useMemo(
    () => new Set(myMembershipsQuery.data?.map((m) => m.id) ?? []),
    [myMembershipsQuery.data],
  )

  const responseQuery = useQuery({
    queryKey: queryKeys.events.myResponse(eventId, token),
    enabled: Boolean(token && eventId) && !isRestoring,
    queryFn: () => getMyEventResponse(token!, eventId!),
  })

  const visibleMods = useMemo(() => {
    if (!detailQuery.data || !myMembershipsQuery.data) return []
    return visibleModulesForUser(detailQuery.data, myProjectSet)
  }, [detailQuery.data, myMembershipsQuery.data, myProjectSet])

  const attendanceGate = useMemo(() => findAttendanceGate(visibleMods), [visibleMods])

  const sortedVisibleMods = useMemo(
    () => [...visibleMods].sort((a, b) => a.module.sort_order - b.module.sort_order),
    [visibleMods],
  )

  const [projectId, setProjectId] = useState<string | null>(null)
  const [single, setSingle] = useState<Record<string, string>>({})
  const [multi, setMulti] = useState<Record<string, string[]>>({})
  const [textVal, setTextVal] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  const selectedAttendanceOptId =
    attendanceGate != null ? (single[attendanceGate.groupId] ?? '').trim() : ''

  const attendanceAnswered = attendanceGate == null || Boolean(selectedAttendanceOptId)

  const declinedAttendance =
    attendanceGate != null &&
    attendanceAnswered &&
    optionLabelIndicatesDecline(
      attendanceGate.optionIdsSorted.get(selectedAttendanceOptId)?.label ?? '',
    )

  const displayMods = useMemo(() => {
    if (!attendanceGate) return sortedVisibleMods
    if (!attendanceAnswered) {
      return sortedVisibleMods.filter((m) => m.module.type === 'attendance')
    }
    if (declinedAttendance) {
      return sortedVisibleMods.filter((m) => m.module.type === 'attendance')
    }
    return sortedVisibleMods
  }, [attendanceGate, attendanceAnswered, declinedAttendance, sortedVisibleMods])

  const sharedProjects = useMemo(() => {
    if (!detailQuery.data) return []
    return detailQuery.data.project_ids.filter((pid) => myProjectSet.has(pid))
  }, [detailQuery.data, myProjectSet])

  useEffect(() => {
    if (!detailQuery.data || !myMembershipsQuery.data) return
    const def = defaultProjectIdForResponse(detailQuery.data, myProjectSet)
    const existing = responseQuery.data?.response?.project_id
    setProjectId((existing ?? def) || null)
  }, [detailQuery.data, myMembershipsQuery.data, myProjectSet, responseQuery.data])

  const seedFromServer = useCallback(() => {
    const answers = responseQuery.data?.answers ?? []

    const nextSingle: Record<string, string> = {}
    const nextMulti: Record<string, string[]> = {}
    const nextText: Record<string, string> = {}

    const byGroup = new Map<string, typeof answers>()
    for (const a of answers) {
      const gid = a.group_id
      if (!gid) continue
      const cur = byGroup.get(gid) ?? []
      cur.push(a)
      byGroup.set(gid, cur)
    }

    for (const md of sortedVisibleMods) {
      for (const gd of md.option_groups) {
        const g = gd.group
        const rows = byGroup.get(g.id) ?? []
        if (g.type === 'single_choice') {
          const o = rows.find((r) => r.option_id)
          if (o?.option_id) nextSingle[g.id] = o.option_id
        } else if (g.type === 'multiple_choice') {
          nextMulti[g.id] = rows.map((r) => r.option_id).filter(Boolean) as string[]
        } else if (g.type === 'text' || g.type === 'number') {
          const t = rows[0]?.text_value
          if (t) nextText[g.id] = t
        }
      }
    }
    setSingle((s) => ({ ...nextSingle, ...s }))
    setMulti((m) => ({ ...nextMulti, ...m }))
    setTextVal((t) => ({ ...nextText, ...t }))
  }, [responseQuery.data, sortedVisibleMods])

  useEffect(() => {
    if (responseQuery.data) seedFromServer()
  }, [responseQuery.data, seedFromServer])

  const inst = detailQuery.data?.instance

  const canEdit = useMemo(() => {
    if (!inst) return false
    if (inst.status !== 'open') return false
    return isBeforeDeadline(inst.response_deadline_at)
  }, [inst])

  const submitMut = useMutation({
    mutationFn: async () => {
      if (!eventId || !token) throw new Error('Sesión')
      const answers = collectAnswers(displayMods, { single, multi, textVal })
      validateRequiredAnswers(displayMods, { single, multi, textVal })
      await submitEventResponse(token, eventId, { project_id: projectId, answers })
    },
    onSuccess: async () => {
      setFormError('')
      setSuccessMsg('Respuesta guardada.')
      await Promise.all([
        qc.invalidateQueries({ queryKey: [...queryKeys.events.myResponseRoot(), eventId] }),
        qc.invalidateQueries({ queryKey: ['user-relevant-upcoming-events'] }),
      ])
    },
    onError: (e) => {
      setSuccessMsg('')
      setFormError(e instanceof Error ? e.message : 'Error al guardar')
    },
  })

  const busy =
    detailQuery.isLoading ||
    myMembershipsQuery.isLoading ||
    responseQuery.isLoading ||
    submitMut.isPending

  function submit() {
    setFormError('')
    submitMut.mutate()
  }

  return {
    inst,
    detailQuery,
    projectNamesQ,
    visibleMods,
    displayMods,
    attendanceGate,
    attendanceAnswered,
    declinedAttendance,
    sharedProjects,
    projectId,
    setProjectId,
    single,
    setSingle,
    multi,
    setMulti,
    textVal,
    setTextVal,
    formError,
    successMsg,
    canEdit,
    busy,
    submit,
    isSubmitting: submitMut.isPending,
  }
}
