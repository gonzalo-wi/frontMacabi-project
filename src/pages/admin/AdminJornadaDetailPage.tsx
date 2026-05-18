import { Link, useNavigate, useParams } from 'react-router-dom'
import { BarChart2, Calendar, CalendarRange, Clock, ExternalLink, FolderOpen, Layers, Loader2, MoreVertical, Pencil, Trash2, Users } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useQueries, useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

import { PageHeader } from '@/components/PageHeader'
import { ActionButton } from '@/components/ActionButton'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
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
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { getEventDetail, deleteEventInstance, listEventParticipantResponses } from '@/features/events/api/eventsApi'
import type {
  EventDetailDTO,
  EventParticipantAnswerDTO,
  EventParticipantResponseDTO,
} from '@/features/events/model/types'
import { EventStatusBadge } from '@/features/events/components/EventStatusBadge'
import type { AttendanceGate } from '@/features/events/lib/attendanceGate'
import {
  attendanceStatusFromAnswers,
  attendanceStatusLabel,
  findAttendanceGate,
} from '@/features/events/lib/attendanceGate'
import { labelInstanceType, labelProjectRole } from '@/features/events/lib/eventLabels'
import { formatStartsAR, isBeforeDeadline } from '@/features/events/lib/deadline'
import { listProjects, listProjectMembers } from '@/features/projects/api/projectsApi'
import { fetchAllUsersForAdmin } from '@/features/projects/lib/projectAdminQueries'
import type { ProjectDTO } from '@/features/projects/model/types'
import type { UserDTO } from '@/lib/api/types'
import { ApiError } from '@/lib/api/apiClient'
import { useAuth } from '@/hooks/useAuth'
import { FeedbackBanner } from '@/components/FeedbackBanner'

async function fetchAllProjects(token: string): Promise<ProjectDTO[]> {
  const out: ProjectDTO[] = []
  let page = 1
  while (page <= 20) {
    const r = await listProjects(token, page, 50)
    out.push(...r.data)
    if (page >= r.total_pages) break
    page++
  }
  return out
}

type AnswerMaps = {
  /** option id → { groupName, optionLabel } */
  optLabels: Map<string, { group: string; label: string }>
  /** group id → group name */
  groupNames: Map<string, string>
  /** group id → { moduleTitle, moduleSortOrder } */
  groupToModule: Map<string, { title: string; sort: number }>
}

function buildAnswerMaps(detail: EventDetailDTO): AnswerMaps {
  const optLabels = new Map<string, { group: string; label: string }>()
  const groupNames = new Map<string, string>()
  const groupToModule = new Map<string, { title: string; sort: number }>()
  for (const md of detail.modules) {
    for (const gd of md.option_groups) {
      groupNames.set(gd.group.id, gd.group.name)
      groupToModule.set(gd.group.id, { title: md.module.title, sort: md.module.sort_order })
      for (const o of gd.options) {
        optLabels.set(o.id, { group: gd.group.name, label: o.label })
      }
    }
  }
  return { optLabels, groupNames, groupToModule }
}

type AnswerLine = { groupName: string; value: string }
type ModuleAnswers = { title: string; sort: number; lines: AnswerLine[] }

/** Agrupa las respuestas por módulo, en orden de sort_order del módulo. */
function groupAnswersByModule(
  answers: EventParticipantAnswerDTO[],
  maps: AnswerMaps,
): ModuleAnswers[] {
  const byModule = new Map<string, ModuleAnswers>()

  for (const a of answers) {
    let groupName = ''
    let value = ''

    if (a.option_id?.trim()) {
      const meta = maps.optLabels.get(a.option_id)
      if (meta) {
        groupName = meta.group
        value = meta.label
      } else {
        groupName = 'Opción'
        value = a.option_id.slice(0, 8) + '…'
      }
    } else {
      const tv = a.text_value != null ? String(a.text_value).trim() : ''
      if (!tv) continue
      groupName = (a.group_id && maps.groupNames.get(a.group_id)) ?? 'Respuesta libre'
      value = tv
    }

    const mod = (a.group_id && maps.groupToModule.get(a.group_id)) || { title: 'Otros', sort: 999 }
    const key = mod.title
    if (!byModule.has(key)) {
      byModule.set(key, { title: mod.title, sort: mod.sort, lines: [] })
    }
    byModule.get(key)!.lines.push({ groupName, value })
  }

  return [...byModule.values()].sort((a, b) => a.sort - b.sort)
}

type ProjectPlacement = { projectId: string; projectName: string; userId: string; role: string }

function attendanceCounts(
  gate: AttendanceGate | null,
  userIds: string[],
  rowByUserId: Map<string, UnifiedParticipantRow>,
) {
  let attend = 0
  let decline = 0
  let pending = 0
  if (!gate) return { attend, decline, pending }
  for (const uid of userIds) {
    const row = rowByUserId.get(uid)
    const st =
      row?.responded && row.responseRow
        ? attendanceStatusFromAnswers(gate, row.responseRow.answers)
        : 'pending'
    if (st === 'attends') attend++
    else if (st === 'declines') decline++
    else pending++
  }
  return { attend, decline, pending }
}

function attendanceBadgeClass(s: string) {
  switch (s) {
    case 'attends':
      return 'border-emerald-300 bg-emerald-50 text-emerald-950'
    case 'declines':
      return 'border-muted-foreground/40 bg-muted text-muted-foreground'
    case 'pending':
    default:
      return 'border-amber-300 bg-amber-50 text-amber-950'
  }
}

type MembershipRow = { projectId: string; projectName: string; role: string }

type UnifiedParticipantRow = {
  userId: string
  displayName: string
  email: string
  memberships: MembershipRow[]
  responded: boolean
  responseRow: EventParticipantResponseDTO | null
}

function ParticipantRowAccordionInner({
  row,
  accordionValue,
  linkedPidsForEventLength,
  eventAttendanceGate,
  answerMaps,
  projectMap,
  subtitleRole,
}: {
  row: UnifiedParticipantRow
  accordionValue: string
  linkedPidsForEventLength: number
  eventAttendanceGate: AttendanceGate | null
  answerMaps: AnswerMaps
  projectMap: Map<string, string>
  /** Una línea bajo el nombre (ej. rol en este proyecto) */
  subtitleRole?: string | null
}) {
  const rowResponse = row.responseRow
  const pid = rowResponse?.response.project_id ?? null

  const att =
    eventAttendanceGate && row.responded && rowResponse
      ? attendanceStatusFromAnswers(eventAttendanceGate, rowResponse.answers)
      : eventAttendanceGate
        ? 'pending'
        : null

  return (
    <AccordionItem key={accordionValue} value={accordionValue} className="border-0">
      <AccordionTrigger className="px-3 py-3 hover:no-underline hover:bg-muted/30 rounded-none [&>svg]:shrink-0">
        <div className="min-w-0 flex-1 space-y-0.5 text-left pr-2">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={[
                'inline-block h-2 w-2 rounded-full shrink-0',
                row.responded ? 'bg-emerald-500' : 'bg-amber-400',
              ].join(' ')}
            />
            <span className="font-medium text-sm">{row.displayName}</span>
            <span className="text-xs text-muted-foreground">{row.email}</span>
            {eventAttendanceGate && att && att !== 'answered_no_gate' && (
              <Badge
                variant="outline"
                className={`text-[10px] font-normal shrink-0 ${attendanceBadgeClass(att)}`}
              >
                Asist.: {attendanceStatusLabel(att)}
              </Badge>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 pl-4">
            {subtitleRole ? (
              <span className="text-xs text-muted-foreground">{subtitleRole}</span>
            ) : null}
            {!subtitleRole && row.memberships.length > 0 && (
              <span className="text-xs text-muted-foreground">
                {row.memberships.map((m, i) => (
                  <span key={`${m.projectId}-${m.role}-${i}`}>
                    {i > 0 ? ' · ' : ''}
                    {m.projectName} ({labelProjectRole(m.role)})
                  </span>
                ))}
              </span>
            )}
            {row.responded && rowResponse ? (
              <span className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">
                Respondió el {formatStartsAR(rowResponse.response.created_at)}
                {pid && projectMap.get(pid) && (
                  <> · <span className="text-foreground/80">{projectMap.get(pid)}</span></>
                )}
              </span>
            ) : (
              <span className="text-xs text-amber-700 dark:text-amber-400">
                Aún no respondió
              </span>
            )}
            {linkedPidsForEventLength > 0 && row.responded && row.memberships.length === 0 && (
              <span className="text-xs text-orange-700 dark:text-orange-400">
                No figura como miembro de los proyectos vinculados
              </span>
            )}
          </div>
        </div>
      </AccordionTrigger>
      <AccordionContent className="border-t border-border/60 bg-muted/10">
        {!row.responded || !rowResponse ? (
          <p className="px-4 py-3 text-xs text-muted-foreground">
            Aún no hay respuesta enviada.
          </p>
        ) : (() => {
          const modules = groupAnswersByModule(rowResponse.answers, answerMaps)
          if (modules.length === 0) {
            return (
              <p className="px-4 py-3 text-xs text-muted-foreground">
                La respuesta no tiene contenido registrado.
              </p>
            )
          }
          return (
            <div className="divide-y divide-border/50">
              {modules.map((mod) => (
                <div key={mod.title} className="px-4 py-3 space-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {mod.title}
                  </p>
                  <dl className="space-y-1.5">
                    {mod.lines.map((line, i) => (
                      <div key={i} className="flex items-baseline gap-3 text-sm">
                        <dt className="shrink-0 text-muted-foreground text-xs w-28">
                          {line.groupName}
                        </dt>
                        <dd className="font-medium text-foreground">{line.value}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              ))}
            </div>
          )
        })()}
      </AccordionContent>
    </AccordionItem>
  )
}

export default function AdminJornadaDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { token, isRestoring } = useAuth()
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [feedback, setFeedback] = useState<{ text: string; variant: 'success' | 'error' } | null>(null)

  const detailQ = useQuery({
    queryKey: ['event-detail', id, token],
    enabled: Boolean(token && id) && !isRestoring,
    queryFn: () => getEventDetail(token!, id!),
  })

  const projectsQ = useQuery({
    queryKey: ['projects-all-p1', token],
    enabled: Boolean(token) && !isRestoring,
    queryFn: () => fetchAllProjects(token!),
  })

  const [respSearch, setRespSearch] = useState('')

  const participantQ = useQuery({
    queryKey: ['event-participant-responses', id, token],
    enabled:
      Boolean(token && id) && !isRestoring && Boolean(detailQ.data?.instance),
    queryFn: () => listEventParticipantResponses(token!, id!),
  })

  const linkedPidsForEvent = detailQ.data?.project_ids ?? []

  const usersAllQ = useQuery({
    queryKey: ['users-all-admin', token],
    enabled:
      Boolean(token) &&
      !isRestoring &&
      Boolean(detailQ.data?.instance) &&
      linkedPidsForEvent.length > 0,
    queryFn: () => fetchAllUsersForAdmin(token!),
  })

  const memberQueries = useQueries({
    queries: linkedPidsForEvent.map((pid) => ({
      queryKey: ['project-members-roster', id, pid, token],
      enabled:
        Boolean(token && id && pid) &&
        !isRestoring &&
        Boolean(detailQ.data?.instance) &&
        linkedPidsForEvent.length > 0,
      queryFn: () => listProjectMembers(token!, pid),
    })),
  })

  const deleteMut = useMutation({
    mutationFn: () => {
      if (!token || !id) throw new Error('Sesión inválida')
      return deleteEventInstance(token, id)
    },
    onSuccess: async () => {
      setFeedback(null)
      setDeleteOpen(false)
      await qc.invalidateQueries({ queryKey: ['admin-events'] })
      navigate('/app/admin/jornadas')
    },
    onError: (e) => {
      setFeedback({
        text: e instanceof ApiError ? e.message : e instanceof Error ? e.message : 'No se pudo eliminar',
        variant: 'error',
      })
      setDeleteOpen(false)
    },
  })

  const answerMaps = useMemo((): AnswerMaps => {
    if (!detailQ.data) {
      return { optLabels: new Map(), groupNames: new Map(), groupToModule: new Map() }
    }
    return buildAnswerMaps(detailQ.data)
  }, [detailQ.data])

  const participantByUserId = useMemo(() => {
    const m = new Map<string, EventParticipantResponseDTO>()
    for (const row of participantQ.data?.data ?? []) {
      m.set(row.response.user_id, row)
    }
    return m
  }, [participantQ.data])

  const rosterByUserId = useMemo(() => {
    const m = new Map<string, MembershipRow[]>()
    const pids = detailQ.data?.project_ids ?? []
    const projNames = new Map((projectsQ.data ?? []).map((p) => [p.id, p.name]))
    for (let i = 0; i < pids.length; i++) {
      const pid = pids[i]
      const rq = memberQueries[i]
      for (const mem of rq?.data?.data ?? []) {
        const uid = mem.user_id
        if (!m.has(uid)) m.set(uid, [])
        m.get(uid)!.push({
          projectId: pid,
          projectName: projNames.get(pid) ?? `${pid.slice(0, 8)}…`,
          role: mem.role,
        })
      }
    }
    return m
  }, [detailQ.data?.project_ids, memberQueries, projectsQ.data])

  const usersById = useMemo(() => {
    const next = new Map<string, UserDTO>()
    for (const u of usersAllQ.data ?? []) {
      next.set(u.id, u)
    }
    return next
  }, [usersAllQ.data])

  const unifiedParticipants = useMemo((): UnifiedParticipantRow[] => {
    const ids = new Set<string>()
    rosterByUserId.forEach((_, uid) => ids.add(uid))
    participantByUserId.forEach((_, uid) => ids.add(uid))
    const rows: UnifiedParticipantRow[] = []
    for (const userId of ids) {
      const resp = participantByUserId.get(userId)
      const memberships = rosterByUserId.get(userId) ?? []
      const profile = usersById.get(userId)
      const displayName =
        resp?.response.user_name?.trim() || profile?.name?.trim() || '(Sin nombre)'
      const email = resp?.response.user_email ?? profile?.email ?? '—'
      rows.push({
        userId,
        displayName,
        email,
        memberships,
        responded: Boolean(resp),
        responseRow: resp ?? null,
      })
    }
    rows.sort((a, b) => {
      if (a.responded !== b.responded) return a.responded ? -1 : 1
      return a.displayName.localeCompare(b.displayName, 'es', { sensitivity: 'base' })
    })
    return rows
  }, [participantByUserId, rosterByUserId, usersById])

  const filteredUnified = useMemo(() => {
    const q = respSearch.trim().toLowerCase()
    if (!q) return unifiedParticipants
    return unifiedParticipants.filter((row) => {
      if (
        row.displayName.toLowerCase().includes(q) ||
        row.email.toLowerCase().includes(q)
      ) {
        return true
      }
      return row.memberships.some((m) => m.projectName.toLowerCase().includes(q))
    })
  }, [unifiedParticipants, respSearch])

  const participationLoading =
    participantQ.isPending ||
    (linkedPidsForEvent.length > 0 &&
      (usersAllQ.isPending || memberQueries.some((rq) => rq.isPending)))

  const pendingInLinkedProjects =
    linkedPidsForEvent.length === 0
      ? null
      : [...rosterByUserId.keys()].filter((uid) => !participantByUserId.has(uid)).length

  const orphanResponders =
    [...participantByUserId.keys()].filter((uid) => !rosterByUserId.has(uid)).length

  const eventAttendanceGate = useMemo(
    () => (detailQ.data ? findAttendanceGate(detailQ.data.modules) : null),
    [detailQ.data],
  )

  const rowByUserId = useMemo(() => {
    const m = new Map<string, UnifiedParticipantRow>()
    for (const r of unifiedParticipants) m.set(r.userId, r)
    return m
  }, [unifiedParticipants])

  const projectPlacementsAll = useMemo((): ProjectPlacement[] => {
    const pids = detailQ.data?.project_ids ?? []
    const projNames = new Map((projectsQ.data ?? []).map((p) => [p.id, p.name]))
    const out: ProjectPlacement[] = []
    for (let i = 0; i < pids.length; i++) {
      const pid = pids[i]
      const rq = memberQueries[i]
      const pname = projNames.get(pid) ?? `${pid.slice(0, 8)}…`
      for (const mem of rq?.data?.data ?? []) {
        out.push({
          projectId: pid,
          projectName: pname,
          userId: mem.user_id,
          role: mem.role,
        })
      }
    }
    return out
  }, [detailQ.data?.project_ids, memberQueries, projectsQ.data])

  const searchMatchedUserIds = useMemo(
    () => new Set(filteredUnified.map((r) => r.userId)),
    [filteredUnified],
  )

  const projectPlacementsFiltered = useMemo(
    () => projectPlacementsAll.filter((p) => searchMatchedUserIds.has(p.userId)),
    [projectPlacementsAll, searchMatchedUserIds],
  )

  const projectSections = useMemo(() => {
    const m = new Map<string, { projectName: string; items: ProjectPlacement[] }>()
    for (const pl of projectPlacementsFiltered) {
      if (!m.has(pl.projectId)) {
        m.set(pl.projectId, { projectName: pl.projectName, items: [] })
      }
      m.get(pl.projectId)!.items.push(pl)
    }
    return [...m.entries()].sort((a, b) =>
      a[1].projectName.localeCompare(b[1].projectName, 'es', { sensitivity: 'base' }),
    )
  }, [projectPlacementsFiltered])

  const orphanFilteredRows = useMemo(
    () => filteredUnified.filter((r) => !rosterByUserId.has(r.userId)),
    [filteredUnified, rosterByUserId],
  )

  if (!id) return null

  const totalResponses = participantQ.data?.data.length ?? 0

  const inst = detailQ.data?.instance
  const title = inst?.title ?? 'Jornada'
  const projectMap = new Map((projectsQ.data ?? []).map((p) => [p.id, p.name]))
  const linkedNames =
    detailQ.data?.project_ids.map((pid) => projectMap.get(pid) ?? pid.slice(0, 8) + '…') ?? []

  const modCount = detailQ.data?.modules.length ?? 0
  const canRespond =
    inst &&
    inst.status === 'open' &&
    isBeforeDeadline(inst.response_deadline_at ?? null)

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
                  <Pencil className="w-4 h-4 mr-1" />
                  Editar
                </Link>
              </ActionButton>
            )}
            {inst && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <ActionButton intent="secondary" disabled={deleteMut.isPending}>
                    <MoreVertical className="w-4 h-4" />
                    Más
                  </ActionButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => {
                      setFeedback(null)
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

      <div className="p-4 lg:p-6 max-w-4xl mx-auto space-y-6">
        {feedback && <FeedbackBanner message={feedback.text} variant={feedback.variant} />}
        {detailQ.isError && (
          <p className="text-sm text-destructive">
            {detailQ.error instanceof ApiError ? detailQ.error.message : 'Error al cargar la jornada'}
          </p>
        )}

        {detailQ.isLoading && (
          <div className="space-y-4">
            <div className="h-36 rounded-xl bg-muted/50 animate-pulse" />
            <div className="h-24 rounded-xl bg-muted/50 animate-pulse opacity-60" />
          </div>
        )}

        {inst && (
          <>
            {/* ── Panel de resumen ── */}
            <div className="rounded-xl border bg-card overflow-hidden">
              {/* Header con estado y acciones */}
              <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-5 pb-4">
                <div className="flex flex-wrap items-center gap-2">
                  <EventStatusBadge status={inst.status} />
                  <Badge variant="secondary" className="text-xs font-normal">
                    {labelInstanceType(inst.type)}
                  </Badge>
                </div>
                {canRespond && (
                  <ActionButton intent="view" asChild>
                    <Link to={`/app/jornadas/${id}/responder`}>
                      <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
                      Ver como participante
                    </Link>
                  </ActionButton>
                )}
              </div>

              {/* Métricas clave */}
              <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 border-t">
                <div className="flex items-start gap-2.5 px-5 py-4">
                  <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Inicio</p>
                    <p className="text-sm font-medium leading-tight mt-0.5">{formatStartsAR(inst.starts_at)}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5 px-5 py-4">
                  <Clock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Límite</p>
                    <p className="text-sm font-medium leading-tight mt-0.5">
                      {inst.response_deadline_at ? formatStartsAR(inst.response_deadline_at) : 'Sin límite'}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5 px-5 py-4">
                  <Layers className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <div>
                    <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Módulos</p>
                    <p className="text-sm font-medium leading-tight mt-0.5">{modCount}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5 px-5 py-4">
                  <FolderOpen className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Proyectos</p>
                    {projectsQ.isLoading ? (
                      <div className="h-4 w-16 bg-muted/50 rounded animate-pulse mt-1" />
                    ) : linkedNames.length === 0 ? (
                      <p className="text-sm font-medium leading-tight mt-0.5 text-muted-foreground">Todos</p>
                    ) : (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {linkedNames.map((name, i) => (
                          <Badge key={i} variant="outline" className="text-[10px] font-normal px-1.5 py-0">
                            {name}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* ── Resultados por módulo ── */}
            {participantQ.isSuccess && totalResponses > 0 && detailQ.data && (
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <BarChart2 className="w-4 h-4 shrink-0 text-primary" />
                      Resultados
                    </CardTitle>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {totalResponses} respuesta{totalResponses === 1 ? '' : 's'}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6 pt-0">
                  {[...detailQ.data.modules]
                    .sort((a, b) => a.module.sort_order - b.module.sort_order)
                    .map((md) => {
                      const groups = [...md.option_groups].sort(
                        (a, b) => a.group.sort_order - b.group.sort_order,
                      )
                      if (groups.length === 0) return null

                      const textsByGroup = new Map<string, string[]>()
                      for (const row of participantQ.data?.data ?? []) {
                        for (const ans of row.answers) {
                          if (!ans.group_id) continue
                          const g = groups.find((gd) => gd.group.id === ans.group_id)
                          if (!g) continue
                          if (g.group.type !== 'text' && g.group.type !== 'number') continue
                          const tv = ans.text_value != null ? String(ans.text_value).trim() : ''
                          if (!tv) continue
                          if (!textsByGroup.has(ans.group_id)) textsByGroup.set(ans.group_id, [])
                          textsByGroup.get(ans.group_id)!.push(tv)
                        }
                      }

                      return (
                        <div key={md.module.id} className="space-y-4">
                          <div className="flex items-center gap-2">
                            <div className="h-px flex-1 bg-border" />
                            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-2">
                              {md.module.title}
                            </span>
                            <div className="h-px flex-1 bg-border" />
                          </div>
                          <div className="space-y-4">
                            {groups.map((gd) => {
                              const g = gd.group
                              const isChoice = g.type === 'single_choice' || g.type === 'multiple_choice'

                              if (isChoice) {
                                const opts = [...gd.options].sort((a, b) => a.sort_order - b.sort_order)
                                const maxCount = Math.max(...opts.map((o) => o.current_count), 1)
                                return (
                                  <div key={g.id} className="space-y-2">
                                    <p className="text-xs font-semibold text-foreground/70">{g.name}</p>
                                    <div className="space-y-1.5">
                                      {opts.map((o) => {
                                        const pct = Math.round((o.current_count / totalResponses) * 100)
                                        const barPct = Math.round((o.current_count / maxCount) * 100)
                                        return (
                                          <div key={o.id} className="flex items-center gap-3">
                                            <span className="w-36 shrink-0 truncate text-sm text-foreground/90">
                                              {o.label}
                                            </span>
                                            <div className="flex-1 h-6 rounded-lg bg-muted/50 overflow-hidden">
                                              <div
                                                className="h-full rounded-lg bg-primary/60 transition-all duration-500"
                                                style={{ width: `${barPct}%` }}
                                              />
                                            </div>
                                            <span className="w-20 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                                              <span className="font-semibold text-foreground">{o.current_count}</span>
                                              {' '}({pct}%)
                                            </span>
                                          </div>
                                        )
                                      })}
                                    </div>
                                  </div>
                                )
                              }

                              const texts = textsByGroup.get(g.id) ?? []
                              if (texts.length === 0) return null
                              return (
                                <div key={g.id} className="space-y-2">
                                  <p className="text-xs font-semibold text-foreground/70">{g.name}</p>
                                  <div className="flex flex-wrap gap-1.5">
                                    {texts.map((t, i) => (
                                      <span key={i} className="rounded-lg border bg-muted/40 px-2.5 py-1 text-xs">
                                        {t}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })}
                </CardContent>
              </Card>
            )}

            {/* ── Participantes ── */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Users className="w-4 h-4 shrink-0 text-primary" />
                    Participantes
                  </CardTitle>
                  {participantQ.isSuccess && !participationLoading && (
                    <div className="flex flex-wrap gap-1.5">
                      <span className="inline-flex items-center rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-900">
                        {totalResponses} respondieron
                      </span>
                      {pendingInLinkedProjects != null && pendingInLinkedProjects > 0 && (
                        <span className="inline-flex items-center rounded-full border border-amber-300 bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-950">
                          {pendingInLinkedProjects} pendiente{pendingInLinkedProjects === 1 ? '' : 's'}
                        </span>
                      )}
                      {orphanResponders > 0 && (
                        <span className="inline-flex items-center rounded-full border border-orange-300 bg-orange-50 px-2.5 py-0.5 text-xs font-medium text-orange-900">
                          {orphanResponders} sin proyecto
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3 pt-0">
                {participationLoading && (
                  <div className="space-y-2 py-2">
                    {[0, 1, 2].map((i) => (
                      <div key={i} className="h-14 rounded-lg bg-muted/40 animate-pulse" style={{ opacity: 1 - i * 0.25 }} />
                    ))}
                  </div>
                )}
                {participantQ.isError && (
                  <p className="text-sm text-destructive">
                    {participantQ.error instanceof ApiError
                      ? participantQ.error.message
                      : 'No se pudieron cargar las respuestas.'}
                  </p>
                )}
                {participantQ.isSuccess && !participationLoading && (
                  <>
                    <Input
                      placeholder="Buscar por nombre, correo o proyecto…"
                      value={respSearch}
                      onChange={(e) => setRespSearch(e.target.value)}
                      className="h-9"
                    />
                    {filteredUnified.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-6 text-center border border-dashed rounded-lg">
                        {unifiedParticipants.length === 0
                          ? 'No hay participantes registrados para esta jornada.'
                          : 'Sin coincidencias con la búsqueda.'}
                      </p>
                    ) : linkedPidsForEvent.length === 0 ? (
                      <Accordion
                        type="multiple"
                        className="rounded-lg border border-border divide-y divide-border overflow-hidden"
                      >
                        {filteredUnified.map((row) => (
                          <ParticipantRowAccordionInner
                            key={row.userId}
                            row={row}
                            accordionValue={row.userId}
                            linkedPidsForEventLength={0}
                            eventAttendanceGate={eventAttendanceGate}
                            answerMaps={answerMaps}
                            projectMap={projectMap}
                          />
                        ))}
                      </Accordion>
                    ) : (
                      <div className="space-y-8">
                        {eventAttendanceGate ? (
                          <p className="text-xs text-muted-foreground rounded-md border bg-muted/20 px-3 py-2">
                            Estado de asistencia según la primera opción del módulo tipo «Asistencia» (opciones tipo «No»
                            / «No asisto» cuentan como no asisten).
                          </p>
                        ) : null}

                        <div className="space-y-5">
                          {projectSections.map(([projId, section]) => {
                            const uids = section.items.map((p) => p.userId)
                            const { attend, decline, pending } = attendanceCounts(
                              eventAttendanceGate,
                              uids,
                              rowByUserId,
                            )
                            const respondedHere = section.items.filter(
                              (pl) => rowByUserId.get(pl.userId)?.responded,
                            ).length

                            const sortedMembers = [...section.items].sort((a, b) => {
                              const na = rowByUserId.get(a.userId)?.displayName ?? ''
                              const nb = rowByUserId.get(b.userId)?.displayName ?? ''
                              return na.localeCompare(nb, 'es', { sensitivity: 'base' })
                            })

                            return (
                              <div key={projId} className="rounded-xl border bg-card overflow-hidden">
                                <div className="border-b bg-muted/25 px-4 py-3 space-y-1">
                                  <h3 className="text-sm font-semibold">{section.projectName}</h3>
                                  <p className="text-[11px] text-muted-foreground flex flex-wrap gap-x-3 gap-y-0.5">
                                    <span>
                                      Miembros: {section.items.length} · Respondieron en esta vista:{' '}
                                      <span className="text-foreground/80">{respondedHere}</span>
                                      {respondedHere < section.items.length ? (
                                        <span className="text-amber-800 dark:text-amber-300">
                                          {' '}
                                          · Pendientes: {section.items.length - respondedHere}
                                        </span>
                                      ) : null}
                                    </span>
                                    {eventAttendanceGate ? (
                                      <span className="text-muted-foreground">
                                        Asist.: <span className="text-emerald-800">{attend}</span>{' '}
                                        · No:{' '}
                                        <span className="text-muted-foreground/90">{decline}</span> · Pend. decisión asist.:{' '}
                                        <span className="text-amber-800">{pending}</span>
                                      </span>
                                    ) : null}
                                  </p>
                                </div>
                                <Accordion
                                  type="multiple"
                                  className="divide-y divide-border"
                                >
                                  {sortedMembers.map((pl) => {
                                    const row = rowByUserId.get(pl.userId)
                                    if (!row) return null
                                    return (
                                      <ParticipantRowAccordionInner
                                        key={`${projId}_${pl.userId}`}
                                        row={row}
                                        accordionValue={`${projId}_${pl.userId}`}
                                        linkedPidsForEventLength={linkedPidsForEvent.length}
                                        eventAttendanceGate={eventAttendanceGate}
                                        answerMaps={answerMaps}
                                        projectMap={projectMap}
                                        subtitleRole={`Rol: ${labelProjectRole(pl.role)}`}
                                      />
                                    )
                                  })}
                                </Accordion>
                              </div>
                            )
                          })}
                        </div>

                        {orphanFilteredRows.length > 0 ? (
                          <div className="rounded-xl border border-orange-300/60 bg-orange-50/40 dark:bg-orange-950/20 px-4 py-3 space-y-3">
                            <div>
                              <h3 className="text-sm font-semibold text-orange-950 dark:text-orange-100">
                                Respondieron pero no están en el roster de los proyectos vinculados
                              </h3>
                              <p className="text-xs text-muted-foreground mt-1">
                                Puede ser usuario actualizado o respuesta cargada antes de membresías.
                              </p>
                            </div>
                            <Accordion
                              type="multiple"
                              className="rounded-lg border border-border divide-y divide-border bg-background overflow-hidden"
                            >
                              {orphanFilteredRows.map((row) => (
                                <ParticipantRowAccordionInner
                                  key={`orph_${row.userId}`}
                                  row={row}
                                  accordionValue={`orph_${row.userId}`}
                                  linkedPidsForEventLength={linkedPidsForEvent.length}
                                  eventAttendanceGate={eventAttendanceGate}
                                  answerMaps={answerMaps}
                                  projectMap={projectMap}
                                />
                              ))}
                            </Accordion>
                          </div>
                        ) : null}
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <AlertDialog open={deleteOpen} onOpenChange={(o) => !deleteMut.isPending && setDeleteOpen(o)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar esta jornada?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará "{title}" por completo: proyectos vinculados al evento, bloques del formulario (módulos,
              grupos y opciones) y todas las respuestas de los participantes. No se puede recuperar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMut.isPending}>Volver</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground"
              disabled={deleteMut.isPending}
              onClick={(e) => {
                e.preventDefault()
                deleteMut.mutate()
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
    </div>
  )
}
