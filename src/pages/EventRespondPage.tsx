import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Loader2, Send } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
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
import type { AnswerInputDTO } from '@/features/events/model/types'
import { isBeforeDeadline } from '@/features/events/lib/deadline'
import { formatStartsAR } from '@/features/events/lib/deadline'
import {
  findAttendanceGate,
  optionLabelIndicatesDecline,
} from '@/features/events/lib/attendanceGate'
import {
  defaultProjectIdForResponse,
  visibleModulesForUser,
} from '@/features/events/lib/visibility'
import { listProjects } from '@/features/projects/api/projectsApi'
import { fetchMyProjectMemberships } from '@/features/projects/lib/myMembership'
import { cn } from '@/lib/utils'
import { ApiError } from '@/lib/api/apiClient'
import { useAuth } from '@/hooks/useAuth'

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

  const attendanceGate = useMemo(
    () => findAttendanceGate(visibleMods),
    [visibleMods],
  )

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

  const attendanceAnswered =
    attendanceGate == null ||
    Boolean(selectedAttendanceOptId)

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
  }, [
    attendanceGate,
    attendanceAnswered,
    declinedAttendance,
    sortedVisibleMods,
  ])

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

    /* seed uses visible modules definition (not gated subset) */
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
      const answers: AnswerInputDTO[] = []
      for (const md of displayMods) {
        for (const gd of md.option_groups) {
          const g = gd.group
          if (g.type === 'single_choice') {
            const oid = single[g.id]
            if (oid) answers.push({ group_id: g.id, option_id: oid })
            continue
          }
          if (g.type === 'multiple_choice') {
            for (const oid of multi[g.id] ?? []) {
              answers.push({ group_id: g.id, option_id: oid })
            }
            continue
          }
          if (g.type === 'text' || g.type === 'number') {
            const raw = (textVal[g.id] ?? '').trim()
            if (raw) {
              answers.push({ group_id: g.id, text_value: raw })
            }
          }
        }
      }

      for (const md of displayMods) {
        for (const gd of md.option_groups) {
          const g = gd.group
          if (!g.is_required) continue
          if (g.type === 'single_choice' && !single[g.id]) {
            throw new Error(`Completá: ${g.name}`)
          }
          if (g.type === 'multiple_choice' && (multi[g.id]?.length ?? 0) === 0) {
            throw new Error(`Elegí al menos una opción: ${g.name}`)
          }
          if ((g.type === 'text' || g.type === 'number') && !(textVal[g.id]?.trim())) {
            throw new Error(`Completá: ${g.name}`)
          }
        }
      }

      await submitEventResponse(token, eventId, {
        project_id: projectId,
        answers,
      })
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
            <Select
              value={projectId ?? ''}
              onValueChange={(v) => setProjectId(v || null)}
            >
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

        {attendanceGate != null &&
          canEdit &&
          !attendanceAnswered && (
          <p className="text-sm rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 dark:border-sky-900 dark:bg-sky-950/40">
            Empezá indicando{' '}
            <span className="font-medium">{attendanceGate.groupName}</span> en el primer bloque. Después aparecerán
            el resto de las preguntas.
          </p>
        )}

        {attendanceGate != null &&
          canEdit &&
          attendanceAnswered &&
          declinedAttendance && (
          <p className="text-sm rounded-lg border border-muted bg-muted/30 px-3 py-2">
            Registramos que no vas a asistir. No necesitás completar el resto del formulario.
          </p>
        )}

        <div className="space-y-4">
          {displayMods.map((md) => (
              <Card key={md.module.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{md.module.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {[...md.option_groups]
                    .sort((a, b) => a.group.sort_order - b.group.sort_order)
                    .map((gd) => {
                      const g = gd.group
                      const opts = [...gd.options].sort((a, b) => a.sort_order - b.sort_order)

                      if (g.type === 'single_choice') {
                        return (
                          <div key={g.id} className="space-y-2">
                            <Label className="text-sm font-medium">
                              {g.name}
                              {g.is_required && <span className="text-destructive"> *</span>}
                            </Label>
                            {!canEdit ? (
                              <p className="text-sm text-muted-foreground">
                                {opts.find((o) => o.id === single[g.id])?.label ?? '—'}
                              </p>
                            ) : (
                              <RadioGroup
                                value={single[g.id] ?? ''}
                                onValueChange={(v) =>
                                  setSingle((s) => ({ ...s, [g.id]: v }))
                                }
                              >
                                {opts.map((o) => {
                                  const full =
                                    o.max_capacity != null && o.current_count >= o.max_capacity
                                  const disabled = full && single[g.id] !== o.id
                                  return (
                                    <label
                                      key={o.id}
                                      className={cn(
                                        'flex items-center gap-2 rounded-lg border px-3 py-2 text-sm',
                                        disabled && 'opacity-50',
                                      )}
                                    >
                                      <RadioGroupItem value={o.id} disabled={disabled} />
                                      <span className="flex-1">{o.label}</span>
                                      {o.max_capacity != null && (
                                        <span className="text-xs text-muted-foreground">
                                          {o.current_count}/{o.max_capacity}
                                        </span>
                                      )}
                                    </label>
                                  )
                                })}
                              </RadioGroup>
                            )}
                          </div>
                        )
                      }

                      if (g.type === 'multiple_choice') {
                        const selected = new Set(multi[g.id] ?? [])
                        return (
                          <div key={g.id} className="space-y-2">
                            <Label className="text-sm font-medium">
                              {g.name}
                              {g.is_required && <span className="text-destructive"> *</span>}
                            </Label>
                            {!canEdit ? (
                              <p className="text-sm text-muted-foreground">
                                {(multi[g.id] ?? [])
                                  .map((id) => opts.find((o) => o.id === id)?.label)
                                  .filter(Boolean)
                                  .join(', ') || '—'}
                              </p>
                            ) : (
                              <div className="space-y-2">
                                {opts.map((o) => {
                                  const full =
                                    o.max_capacity != null &&
                                    o.current_count >= o.max_capacity &&
                                    !selected.has(o.id)
                                  const checked = selected.has(o.id)
                                  return (
                                    <label
                                      key={o.id}
                                      className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm"
                                    >
                                      <input
                                        type="checkbox"
                                        className="rounded border-input"
                                        checked={checked}
                                        disabled={full}
                                        onChange={() => {
                                          setMulti((m) => {
                                            const cur = new Set(m[g.id] ?? [])
                                            if (cur.has(o.id)) cur.delete(o.id)
                                            else cur.add(o.id)
                                            return { ...m, [g.id]: [...cur] }
                                          })
                                        }}
                                      />
                                      <span className="flex-1">{o.label}</span>
                                      {o.max_capacity != null && (
                                        <span className="text-xs text-muted-foreground">
                                          {o.current_count}/{o.max_capacity}
                                        </span>
                                      )}
                                    </label>
                                  )
                                })}
                              </div>
                            )}
                          </div>
                        )
                      }

                      if (g.type === 'text' || g.type === 'number') {
                        return (
                          <div key={g.id} className="space-y-2">
                            <Label htmlFor={g.id} className="text-sm font-medium">
                              {g.name}
                              {g.is_required && <span className="text-destructive"> *</span>}
                            </Label>
                            {!canEdit ? (
                              <p className="text-sm text-muted-foreground">{textVal[g.id] ?? '—'}</p>
                            ) : (
                              <Input
                                id={g.id}
                                type={g.type === 'number' ? 'number' : 'text'}
                                value={textVal[g.id] ?? ''}
                                onChange={(e) =>
                                  setTextVal((t) => ({ ...t, [g.id]: e.target.value }))
                                }
                                className="h-11"
                              />
                            )}
                          </div>
                        )
                      }

                      return (
                        <p key={g.id} className="text-sm text-muted-foreground">
                          Tipo de grupo no soportado: {g.type}
                        </p>
                      )
                    })}
                </CardContent>
              </Card>
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
