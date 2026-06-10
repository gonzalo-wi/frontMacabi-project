import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Loader2, Send } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  getEventDetail,
  getMyEventResponse,
  submitEventResponse,
} from '@/features/events/api/eventsApi'
import { DeadlineBadge } from '@/features/events/components/DeadlineBadge'
import { isBeforeDeadline, formatStartsAR } from '@/features/events/lib/deadline'
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
import { ApiError } from '@/lib/api/apiClient'
import { useAuth } from '@/hooks/useAuth'

import { ResponseModuleCard } from './ResponseModuleCard'

export default function EventRespondPage() {
  const { id: eventId } = useParams<{ id: string }>()
  const { token, user, isRestoring } = useAuth()
  const qc = useQueryClient()

  const detailQuery = useQuery({
    queryKey: ['event-detail', eventId, token],
    enabled: Boolean(token && eventId) && !isRestoring,
    queryFn: () => getEventDetail(token!, eventId!),
  })

  const myMembershipsQuery = useQuery({
    queryKey: ['my-project-memberships', user?.id, token],
    enabled: Boolean(token && user?.id) && !isRestoring,
    queryFn: () => fetchMyProjectMemberships(token!, user!.id),
  })

  const projectNamesQ = useQuery({
    queryKey: ['project-name-map', token],
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
    queryKey: ['event-my-response', eventId, token],
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

  /** Módulos mostrados: sin gate → todos; con gate → solo asistencia hasta responder; si declina, no el resto. */
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
      await qc.invalidateQueries({ queryKey: ['event-my-response', eventId] })
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

  if (!eventId) {
    return <p className="p-6 text-sm text-muted-foreground">Jornada no encontrada.</p>
  }

  return (
    <div className="min-h-screen pb-24">
      <PageHeader
        icon={Send}
        title="Responder jornada"
        subtitle={inst?.title}
        action={
          <Button variant="outline" size="sm" asChild>
            <Link to="/app">
              <ArrowLeft className="w-4 h-4 mr-1" />
              Panel
            </Link>
          </Button>
        }
      />

      <div className="p-4 lg:p-6 max-w-2xl mx-auto space-y-4">
        {detailQuery.isError && (
          <p className="text-sm text-destructive">
            {detailQuery.error instanceof ApiError
              ? detailQuery.error.message
              : 'No se pudo cargar la jornada.'}
          </p>
        )}

        {inst && (
          <div className="space-y-1 text-sm text-muted-foreground">
            <p>Inicio: {formatStartsAR(inst.starts_at)}</p>
            <DeadlineBadge responseDeadlineAt={inst.response_deadline_at} />
          </div>
        )}

        {sharedProjects.length > 1 && canEdit && (
          <div className="space-y-2">
            <Label>Proyecto (contexto de respuesta)</Label>
            <Select value={projectId ?? ''} onValueChange={(v) => setProjectId(v || null)}>
              <SelectTrigger className="h-11">
                <SelectValue placeholder="Elegí proyecto" />
              </SelectTrigger>
              <SelectContent>
                {sharedProjects.map((pid) => (
                  <SelectItem key={pid} value={pid}>
                    {projectNamesQ.data?.get(pid) ?? pid}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Varias membrecías coinciden con esta jornada; elegí con cuál respondés.
            </p>
          </div>
        )}

        {!canEdit && inst && (
          <p className="text-sm rounded-lg border border-amber-200 bg-amber-50 text-amber-900 px-3 py-2 dark:bg-amber-950/30 dark:text-amber-100 dark:border-amber-900">
            Solo lectura: la jornada no está abierta o el plazo de respuestas ya pasó.
          </p>
        )}

        {formError && (
          <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">{formError}</p>
        )}
        {successMsg && (
          <p className="text-sm text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2">{successMsg}</p>
        )}

        {visibleMods.length === 0 && !detailQuery.isLoading && detailQuery.data && (
          <p className="text-sm text-muted-foreground">
            No hay módulos visibles para tu rol en esta jornada.
          </p>
        )}

        {attendanceGate != null && canEdit && !attendanceAnswered && (
          <p className="text-sm rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 dark:border-sky-900 dark:bg-sky-950/40">
            Empezá indicando{' '}
            <span className="font-medium">{attendanceGate.groupName}</span> en el primer bloque. Después aparecerán
            el resto de las preguntas.
          </p>
        )}

        {attendanceGate != null && canEdit && attendanceAnswered && declinedAttendance && (
          <p className="text-sm rounded-lg border border-muted bg-muted/30 px-3 py-2">
            Registramos que no vas a asistir. No necesitás completar el resto del formulario.
          </p>
        )}

        <div className="space-y-4">
          {displayMods.map((md) => (
            <ResponseModuleCard
              key={md.module.id}
              md={md}
              canEdit={canEdit}
              single={single}
              setSingle={setSingle}
              multi={multi}
              setMulti={setMulti}
              textVal={textVal}
              setTextVal={setTextVal}
            />
          ))}
        </div>

        {canEdit && displayMods.length > 0 && (
          <Button
            className="w-full h-11"
            disabled={busy}
            onClick={() => {
              setFormError('')
              submitMut.mutate()
            }}
          >
            {submitMut.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Guardando…
              </>
            ) : (
              'Guardar respuesta'
            )}
          </Button>
        )}
      </div>
    </div>
  )
}
