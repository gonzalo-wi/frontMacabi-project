import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  AlertTriangle,
  BarChart2,
  Calendar,
  CalendarRange,
  ChevronDown,
  Clock,
  ExternalLink,
  FolderOpen,
  Layers,
  MoreVertical,
  Pencil,
  Search,
  Trash2,
  Users,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { useQueries, useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

import { PageHeader } from '@/components/PageHeader'
import { ActionButton } from '@/components/ActionButton'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  getEventDetail,
  deleteEventInstance,
  listEventParticipantResponses,
  getModuleResponseSummary,
} from '@/features/events/api/eventsApi'
import type {
  EventDetailDTO,
  EventParticipantAnswerDTO,
  EventParticipantResponseDTO,
  ModuleResponseSummaryDTO,
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
import { fetchAllProjects, listProjectMembers } from '@/features/projects/api/projectsApi'
import { fetchAllUsersForAdmin } from '@/features/projects/lib/projectAdminQueries'
import type { UserDTO } from '@/lib/api/types'
import { ApiError } from '@/lib/api/apiClient'
import { useAuth } from '@/hooks/useAuth'
import { FeedbackBanner } from '@/components/FeedbackBanner'
import { useFeedback } from '@/hooks/useFeedback'
import { cn } from '@/lib/utils'

// ─────────────────────────────────────────────────────────────────────────────
// Data helpers
// ─────────────────────────────────────────────────────────────────────────────

type AnswerMaps = {
  optLabels: Map<string, { group: string; label: string }>
  groupNames: Map<string, string>
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
    if (!byModule.has(key)) byModule.set(key, { title: mod.title, sort: mod.sort, lines: [] })
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
      return 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
    case 'declines':
      return 'border-muted-foreground/30 bg-muted text-muted-foreground'
    case 'pending':
    default:
      return 'border-amber-300 bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
  }
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')
}

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type MembershipRow = { projectId: string; projectName: string; role: string }

type UnifiedParticipantRow = {
  userId: string
  displayName: string
  email: string
  memberships: MembershipRow[]
  responded: boolean
  responseRow: EventParticipantResponseDTO | null
}

// ─────────────────────────────────────────────────────────────────────────────
// ParticipantRowAccordionInner
// ─────────────────────────────────────────────────────────────────────────────

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
    <AccordionItem value={accordionValue} className="border-0">
      <AccordionTrigger className="px-4 py-0 hover:no-underline hover:bg-muted/40 rounded-none [&>svg]:shrink-0 [&>svg]:text-muted-foreground min-h-[64px]">
        <div className="min-w-0 flex-1 flex items-center gap-3 text-left py-3">
          {/* Avatar iniciales */}
          <div
            className={cn(
              'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold select-none',
              row.responded
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300'
                : 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300',
            )}
          >
            {getInitials(row.displayName) || '?'}
          </div>

          {/* Contenido */}
          <div className="min-w-0 flex-1 space-y-1">
            {/* Línea 1: nombre + badge asistencia */}
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="font-semibold text-sm text-foreground leading-tight">
                {row.displayName}
              </span>
              {eventAttendanceGate && att && att !== 'answered_no_gate' && (
                <Badge
                  variant="outline"
                  className={cn('text-[10px] font-medium py-0 px-1.5 h-4', attendanceBadgeClass(att))}
                >
                  {attendanceStatusLabel(att)}
                </Badge>
              )}
            </div>

            {/* Línea 2: email + rol/proyecto */}
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0 text-xs text-muted-foreground">
              <span className="truncate max-w-[200px]">{row.email}</span>
              {subtitleRole && (
                <>
                  <span className="text-border">·</span>
                  <span>{subtitleRole}</span>
                </>
              )}
              {!subtitleRole && row.memberships.length > 0 && (
                <>
                  <span className="text-border">·</span>
                  <span className="truncate">
                    {row.memberships
                      .map((m) => `${m.projectName} (${labelProjectRole(m.role)})`)
                      .join(' · ')}
                  </span>
                </>
              )}
            </div>

            {/* Línea 3: estado de respuesta */}
            <div className="flex flex-wrap items-center gap-1 text-xs">
              {row.responded && rowResponse ? (
                <span className="text-emerald-700 dark:text-emerald-400 font-medium">
                  Respondió el {formatStartsAR(rowResponse.response.created_at)}
                  {pid && projectMap.get(pid) && (
                    <span className="text-foreground/60 font-normal">
                      {' '}· {projectMap.get(pid)}
                    </span>
                  )}
                </span>
              ) : (
                <span className="text-amber-700 dark:text-amber-400">Sin respuesta aún</span>
              )}
              {linkedPidsForEventLength > 0 && row.responded && row.memberships.length === 0 && (
                <span className="text-orange-700 dark:text-orange-400">
                  · No figura en el roster
                </span>
              )}
            </div>
          </div>
        </div>
      </AccordionTrigger>

      <AccordionContent className="border-t border-border/50 bg-muted/10 px-0 pb-0">
        {!row.responded || !rowResponse ? (
          <p className="px-4 py-4 text-xs text-muted-foreground text-center">
            Aún no hay respuesta enviada.
          </p>
        ) : (() => {
          const modules = groupAnswersByModule(rowResponse.answers, answerMaps)
          if (modules.length === 0) {
            return (
              <p className="px-4 py-4 text-xs text-muted-foreground text-center">
                La respuesta no tiene contenido registrado.
              </p>
            )
          }
          return (
            <div className="divide-y divide-border/40">
              {modules.map((mod) => (
                <div key={mod.title} className="px-4 py-3 space-y-2.5">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">
                    {mod.title}
                  </p>
                  <dl className="space-y-2">
                    {mod.lines.map((line, i) => (
                      <div key={i} className="flex gap-3 text-sm">
                        <dt className="shrink-0 text-muted-foreground text-xs w-24 pt-0.5 leading-tight">
                          {line.groupName}
                        </dt>
                        <dd className="font-medium text-foreground min-w-0 break-words">
                          {line.value}
                        </dd>
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

// ─────────────────────────────────────────────────────────────────────────────
// Stat chip helper
// ─────────────────────────────────────────────────────────────────────────────

function StatChip({
  children,
  color = 'neutral',
}: {
  children: React.ReactNode
  color?: 'neutral' | 'green' | 'amber' | 'orange'
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium tabular-nums',
        color === 'green' &&
          'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300',
        color === 'amber' &&
          'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300',
        color === 'orange' &&
          'border-orange-200 bg-orange-50 text-orange-800 dark:border-orange-800 dark:bg-orange-950/40 dark:text-orange-300',
        color === 'neutral' && 'border-border bg-card text-muted-foreground',
      )}
    >
      {children}
    </span>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Skeleton loader
// ─────────────────────────────────────────────────────────────────────────────

function SkeletonRows({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-2 py-1">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="h-16 rounded-xl bg-muted/50 animate-pulse"
          style={{ opacity: 1 - i * 0.2 }}
        />
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Page component
// ─────────────────────────────────────────────────────────────────────────────

export default function AdminJornadaDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { token, isRestoring } = useAuth()
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [expandedOptions, setExpandedOptions] = useState<Set<string>>(new Set())
  const { feedback, setFeedback } = useFeedback()

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
    enabled: Boolean(token && id) && !isRestoring && Boolean(detailQ.data?.instance),
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

  const moduleIds = useMemo(
    () => (detailQ.data?.modules ?? []).map((md) => md.module.id),
    [detailQ.data],
  )

  const summaryQueries = useQueries({
    queries: moduleIds.map((moduleId) => ({
      queryKey: ['module-response-summary', moduleId, token],
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
    if (!detailQ.data) return { optLabels: new Map(), groupNames: new Map(), groupToModule: new Map() }
    return buildAnswerMaps(detailQ.data)
  }, [detailQ.data])

  const participantByUserId = useMemo(() => {
    const m = new Map<string, EventParticipantResponseDTO>()
    for (const row of participantQ.data?.data ?? []) m.set(row.response.user_id, row)
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
    for (const u of usersAllQ.data ?? []) next.set(u.id, u)
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
      const displayName = resp?.response.user_name?.trim() || profile?.name?.trim() || '(Sin nombre)'
      const email = resp?.response.user_email ?? profile?.email ?? '—'
      rows.push({ userId, displayName, email, memberships, responded: Boolean(resp), responseRow: resp ?? null })
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
      if (row.displayName.toLowerCase().includes(q) || row.email.toLowerCase().includes(q)) return true
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

  const orphanResponders = [...participantByUserId.keys()].filter(
    (uid) => !rosterByUserId.has(uid),
  ).length

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
        out.push({ projectId: pid, projectName: pname, userId: mem.user_id, role: mem.role })
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
      if (!m.has(pl.projectId)) m.set(pl.projectId, { projectName: pl.projectName, items: [] })
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
    inst && inst.status === 'open' && isBeforeDeadline(inst.response_deadline_at ?? null)

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

      <div className="px-3 py-4 sm:px-4 lg:px-6 lg:py-6 max-w-4xl mx-auto space-y-4 sm:space-y-6">
        {feedback && <FeedbackBanner message={feedback.text} variant={feedback.variant} />}

        {detailQ.isError && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {detailQ.error instanceof ApiError ? detailQ.error.message : 'Error al cargar la jornada'}
          </div>
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
            {/* ── Panel de resumen ─────────────────────────────────────── */}
            <div className="rounded-2xl border bg-card overflow-hidden shadow-sm">
              {/* Header: estado + acción */}
              <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-5 pt-4 pb-3 sm:pt-5 sm:pb-4">
                <div className="flex flex-wrap items-center gap-2">
                  <EventStatusBadge status={inst.status} />
                  <Badge variant="secondary" className="text-xs font-normal">
                    {labelInstanceType(inst.type)}
                  </Badge>
                </div>
                {canRespond && (
                  <ActionButton intent="view" asChild size="sm">
                    <Link to={`/app/jornadas/${id}/responder`}>
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span className="hidden xs:inline">Ver como participante</span>
                      <span className="xs:hidden">Vista participante</span>
                    </Link>
                  </ActionButton>
                )}
              </div>

              {/* Métricas: 2×2 en mobile, 4×1 en sm+ */}
              <div className="grid grid-cols-2 sm:grid-cols-4 border-t divide-border divide-x divide-y sm:divide-y-0">
                {/* Inicio */}
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

                {/* Límite */}
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

                {/* Módulos */}
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

                {/* Proyectos */}
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

            {/* ── Resultados por módulo ──────────────────────────────── */}
            {participantQ.isSuccess && totalResponses > 0 && detailQ.data && (
              <Card className="rounded-2xl shadow-sm border overflow-hidden">
                <CardHeader className="pb-2 px-4 sm:px-6 pt-4 sm:pt-5">
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                      <BarChart2 className="w-4 h-4 shrink-0 text-primary" />
                      Resultados agregados
                    </CardTitle>
                    <StatChip color="neutral">
                      {totalResponses} respuesta{totalResponses !== 1 && 's'}
                    </StatChip>
                  </div>
                </CardHeader>

                <CardContent className="space-y-6 pt-2 px-4 sm:px-6 pb-5">
                  {summariesLoading && <SkeletonRows count={2} />}

                  {!summariesLoading &&
                    [...detailQ.data.modules]
                      .sort((a, b) => a.module.sort_order - b.module.sort_order)
                      .map((md) => {
                        const summary = summariesByModuleId.get(md.module.id)
                        if (!summary) return null
                        const groups = summary.groups
                        if (groups.length === 0) return null

                        return (
                          <div key={md.module.id} className="space-y-4">
                            {/* Separador de módulo */}
                            <div className="flex items-center gap-3">
                              <div className="h-px flex-1 bg-border" />
                              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-1 shrink-0">
                                {summary.module.title}
                              </span>
                              <div className="h-px flex-1 bg-border" />
                            </div>

                            <div className="space-y-5">
                              {groups.map((g, gi) => {
                                const isChoice =
                                  g.type === 'single_choice' || g.type === 'multiple_choice'

                                if (isChoice) {
                                  const maxCount = Math.max(...g.options.map((o) => o.count), 1)
                                  return (
                                    <div key={g.id ?? gi} className="space-y-2">
                                      <p className="text-xs font-semibold text-foreground/70">
                                        {g.name}
                                      </p>
                                      <div className="space-y-2">
                                        {g.options.map((o, oi) => {
                                          const pct =
                                            totalResponses > 0
                                              ? Math.round((o.count / totalResponses) * 100)
                                              : 0
                                          const barPct = Math.round((o.count / maxCount) * 100)
                                          const optKey = `${md.module.id}-${gi}-${oi}`
                                          const isExpanded = expandedOptions.has(optKey)
                                          const hasUsers = o.users.length > 0

                                          return (
                                            <div key={o.id ?? oi}>
                                              <div
                                                className={cn(
                                                  'flex items-center gap-2 sm:gap-3 rounded-xl px-2 py-1 -mx-2 transition-colors',
                                                  hasUsers
                                                    ? 'cursor-pointer hover:bg-muted/40 active:bg-muted/60'
                                                    : '',
                                                )}
                                                onClick={
                                                  hasUsers
                                                    ? () =>
                                                        setExpandedOptions((prev) => {
                                                          const next = new Set(prev)
                                                          if (next.has(optKey)) next.delete(optKey)
                                                          else next.add(optKey)
                                                          return next
                                                        })
                                                    : undefined
                                                }
                                              >
                                                {/* Label */}
                                                <span className="w-20 sm:w-32 shrink-0 text-xs sm:text-sm text-foreground/85 leading-tight">
                                                  {o.label}
                                                </span>

                                                {/* Barra */}
                                                <div className="flex-1 h-5 rounded-full bg-muted/60 overflow-hidden min-w-0">
                                                  <div
                                                    className="h-full rounded-full bg-primary/65 transition-all duration-500"
                                                    style={{ width: `${barPct}%` }}
                                                  />
                                                </div>

                                                {/* Número + % */}
                                                <div className="flex items-baseline gap-1 shrink-0 min-w-[3.5rem] justify-end">
                                                  <span className="text-sm font-bold text-foreground tabular-nums">
                                                    {o.count}
                                                  </span>
                                                  <span className="text-[10px] text-muted-foreground tabular-nums hidden sm:inline">
                                                    ({pct}%)
                                                  </span>
                                                </div>

                                                {hasUsers && (
                                                  <ChevronDown
                                                    className={cn(
                                                      'h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform duration-200',
                                                      isExpanded && 'rotate-180',
                                                    )}
                                                  />
                                                )}
                                              </div>

                                              {/* Usuarios expandidos */}
                                              {hasUsers && isExpanded && (
                                                <div className="flex flex-wrap gap-1 pt-1.5 pb-1 pl-3 sm:pl-36">
                                                  {o.users.map((u, ui) => (
                                                    <span
                                                      key={ui}
                                                      className="text-[10px] text-muted-foreground bg-muted/70 border border-border/50 rounded-full px-2 py-0.5"
                                                      title={u.user_email}
                                                    >
                                                      {u.user_name}
                                                    </span>
                                                  ))}
                                                </div>
                                              )}
                                            </div>
                                          )
                                        })}
                                      </div>
                                    </div>
                                  )
                                }

                                if (g.text_answers.length === 0) return null
                                return (
                                  <div key={g.id ?? gi} className="space-y-2">
                                    <p className="text-xs font-semibold text-foreground/70">
                                      {g.name}
                                    </p>
                                    <div className="flex flex-wrap gap-1.5">
                                      {g.text_answers.map((ta, tai) => (
                                        <span
                                          key={tai}
                                          className="rounded-xl border bg-muted/40 px-2.5 py-1 text-xs leading-tight"
                                          title={ta.user.user_name}
                                        >
                                          {ta.value}
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

            {/* ── Participantes ─────────────────────────────────────── */}
            <Card className="rounded-2xl shadow-sm border overflow-hidden">
              <CardHeader className="pb-2 px-4 sm:px-6 pt-4 sm:pt-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <Users className="w-4 h-4 shrink-0 text-primary" />
                    Participantes
                  </CardTitle>

                  {participantQ.isSuccess && !participationLoading && (
                    <div className="flex flex-wrap gap-1.5">
                      <StatChip color="green">{totalResponses} respondieron</StatChip>
                      {pendingInLinkedProjects != null && pendingInLinkedProjects > 0 && (
                        <StatChip color="amber">
                          {pendingInLinkedProjects} pendiente
                          {pendingInLinkedProjects !== 1 && 's'}
                        </StatChip>
                      )}
                      {orphanResponders > 0 && (
                        <StatChip color="orange">{orphanResponders} sin proyecto</StatChip>
                      )}
                    </div>
                  )}
                </div>
              </CardHeader>

              <CardContent className="space-y-3 pt-1 px-4 sm:px-6 pb-5">
                {participationLoading && <SkeletonRows count={3} />}

                {participantQ.isError && (
                  <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                    {participantQ.error instanceof ApiError
                      ? participantQ.error.message
                      : 'No se pudieron cargar las respuestas.'}
                  </div>
                )}

                {participantQ.isSuccess && !participationLoading && (
                  <>
                    {/* Search */}
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                      <Input
                        placeholder="Buscar por nombre, correo o proyecto…"
                        value={respSearch}
                        onChange={(e) => setRespSearch(e.target.value)}
                        className="pl-9 h-10 sm:h-9 bg-muted/30 border-border/60 focus:bg-background"
                      />
                    </div>

                    {/* Vacío */}
                    {filteredUnified.length === 0 && (
                      <div className="flex flex-col items-center gap-2 py-10 text-center border border-dashed rounded-xl">
                        <Users className="w-8 h-8 text-muted-foreground/40" />
                        <p className="text-sm text-muted-foreground">
                          {unifiedParticipants.length === 0
                            ? 'No hay participantes registrados para esta jornada.'
                            : 'Sin coincidencias con la búsqueda.'}
                        </p>
                      </div>
                    )}

                    {/* Lista sin proyectos vinculados */}
                    {filteredUnified.length > 0 && linkedPidsForEvent.length === 0 && (
                      <Accordion
                        type="multiple"
                        className="rounded-xl border divide-y divide-border overflow-hidden"
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
                    )}

                    {/* Lista por proyecto */}
                    {filteredUnified.length > 0 && linkedPidsForEvent.length > 0 && (
                      <div className="space-y-4 sm:space-y-6">
                        {/* Nota de asistencia */}
                        {eventAttendanceGate && (
                          <p className="text-xs text-muted-foreground rounded-xl border bg-muted/20 px-3.5 py-2.5 leading-relaxed">
                            Estado de asistencia según la primera opción del módulo tipo «Asistencia»
                            (opciones tipo «No» / «No asisto» cuentan como no asisten).
                          </p>
                        )}

                        {/* Secciones por proyecto */}
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
                          const allResponded = respondedHere === section.items.length

                          const sortedMembers = [...section.items].sort((a, b) => {
                            const na = rowByUserId.get(a.userId)?.displayName ?? ''
                            const nb = rowByUserId.get(b.userId)?.displayName ?? ''
                            return na.localeCompare(nb, 'es', { sensitivity: 'base' })
                          })

                          return (
                            <div
                              key={projId}
                              className="rounded-2xl border bg-card overflow-hidden shadow-sm"
                            >
                              {/* Header del proyecto */}
                              <div className="px-4 py-3 sm:px-5 sm:py-3.5 border-b bg-muted/20">
                                <div className="flex flex-wrap items-start justify-between gap-2">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <div className="h-2 w-2 rounded-full bg-primary/60 shrink-0 mt-1" />
                                    <h3 className="text-sm font-bold text-foreground leading-tight">
                                      {section.projectName}
                                    </h3>
                                  </div>
                                  <div className="flex flex-wrap gap-1.5">
                                    <StatChip color="neutral">
                                      {section.items.length} miembros
                                    </StatChip>
                                    <StatChip color={allResponded ? 'green' : 'amber'}>
                                      {respondedHere}/{section.items.length} respondieron
                                    </StatChip>
                                    {eventAttendanceGate && (
                                      <StatChip color="neutral">
                                        <span className="text-emerald-700 dark:text-emerald-400">
                                          {attend} asisten
                                        </span>
                                        <span className="text-border mx-0.5">·</span>
                                        <span className="text-muted-foreground">{decline} no</span>
                                        <span className="text-border mx-0.5">·</span>
                                        <span className="text-amber-700 dark:text-amber-400">
                                          {pending} pend.
                                        </span>
                                      </StatChip>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Lista */}
                              <Accordion type="multiple" className="divide-y divide-border/60">
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

                        {/* Respondedores sin roster */}
                        {orphanFilteredRows.length > 0 && (
                          <div className="rounded-2xl border border-orange-200/70 dark:border-orange-800/50 bg-orange-50/50 dark:bg-orange-950/20 overflow-hidden shadow-sm">
                            <div className="flex items-start gap-3 px-4 py-3 sm:px-5 border-b border-orange-200/60 dark:border-orange-800/40">
                              <AlertTriangle className="h-4 w-4 text-orange-600 dark:text-orange-400 shrink-0 mt-0.5" />
                              <div>
                                <h3 className="text-sm font-bold text-orange-950 dark:text-orange-100 leading-tight">
                                  Respondieron pero no están en el roster
                                </h3>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  Puede ser usuario actualizado o respuesta cargada antes de membresías.
                                </p>
                              </div>
                            </div>
                            <Accordion
                              type="multiple"
                              className="divide-y divide-border/60 bg-background/60"
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
                        )}
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* ── Dialog de confirmación de borrado ── */}
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
