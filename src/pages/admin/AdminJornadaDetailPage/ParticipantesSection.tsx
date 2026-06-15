import { useMemo, useState } from 'react'
import { useQueries, useQuery } from '@tanstack/react-query'
import { AlertTriangle, Search, Users } from 'lucide-react'

import { ErrorBanner } from '@/components/data/ErrorBanner'
import { SkeletonRows } from '@/components/data/SkeletonRows'
import { Accordion } from '@/components/ui/accordion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { findAttendanceGate } from '@/features/events/lib/attendanceGate'
import {
  attendanceCounts,
  buildAnswerMaps,
  type MembershipRow,
  type ProjectPlacement,
  type UnifiedParticipantRow,
} from '@/features/events/lib/jornadaDetail'
import { labelProjectRole } from '@/features/events/lib/eventLabels'
import type { EventDetailDTO, EventParticipantResponseDTO } from '@/features/events/model/types'
import { listProjectMembers } from '@/features/projects/api/projectsApi'
import { fetchAllUsersForAdmin } from '@/features/projects/lib/projectAdminQueries'
import type { UserDTO } from '@/lib/api/types'
import { ApiError } from '@/lib/api/apiClient'

import { ParticipantRowAccordionInner } from './ParticipantRowAccordion'
import { StatChip } from './StatChip'

type ProjectLite = { id: string; name: string }

/**
 * Sección "Participantes" de la ficha de jornada: cruza respuestas con el roster
 * de los proyectos vinculados, agrupa por proyecto y permite buscar. Trae sus
 * propios datos (roster de miembros + usuarios) y deriva todo internamente.
 */
export function ParticipantesSection({
  token,
  eventId,
  detail,
  projects,
  participantResponses,
  participantPending,
  participantIsError,
  participantError,
  participantIsSuccess,
}: {
  token: string
  eventId: string
  detail: EventDetailDTO
  projects: ProjectLite[]
  participantResponses: EventParticipantResponseDTO[]
  participantPending: boolean
  participantIsError: boolean
  participantError: unknown
  participantIsSuccess: boolean
}) {
  const [respSearch, setRespSearch] = useState('')

  const linkedPids = useMemo(() => detail.project_ids ?? [], [detail])

  const projectMap = useMemo(
    () => new Map(projects.map((p) => [p.id, p.name])),
    [projects],
  )

  const usersAllQ = useQuery({
    queryKey: ['admin-users-all', token],
    enabled: Boolean(token) && linkedPids.length > 0,
    queryFn: () => fetchAllUsersForAdmin(token),
  })

  const memberQueries = useQueries({
    queries: linkedPids.map((pid) => ({
      queryKey: ['project-members-roster', eventId, pid, token],
      enabled: Boolean(token && eventId && pid) && linkedPids.length > 0,
      queryFn: () => listProjectMembers(token, pid),
    })),
  })

  const answerMaps = useMemo(() => buildAnswerMaps(detail), [detail])

  const participantByUserId = useMemo(() => {
    const m = new Map<string, EventParticipantResponseDTO>()
    for (const row of participantResponses) m.set(row.response.user_id, row)
    return m
  }, [participantResponses])

  const rosterByUserId = useMemo(() => {
    const m = new Map<string, MembershipRow[]>()
    for (let i = 0; i < linkedPids.length; i++) {
      const pid = linkedPids[i]
      const rq = memberQueries[i]
      for (const mem of rq?.data?.data ?? []) {
        const uid = mem.user_id
        if (!m.has(uid)) m.set(uid, [])
        m.get(uid)!.push({
          projectId: pid,
          projectName: projectMap.get(pid) ?? `${pid.slice(0, 8)}…`,
          role: mem.role,
        })
      }
    }
    return m
  }, [linkedPids, memberQueries, projectMap])

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
    participantPending ||
    (linkedPids.length > 0 && (usersAllQ.isPending || memberQueries.some((rq) => rq.isPending)))

  const totalResponses = participantResponses.length

  const pendingInLinkedProjects =
    linkedPids.length === 0
      ? null
      : [...rosterByUserId.keys()].filter((uid) => !participantByUserId.has(uid)).length

  const orphanResponders = [...participantByUserId.keys()].filter(
    (uid) => !rosterByUserId.has(uid),
  ).length

  const eventAttendanceGate = useMemo(() => findAttendanceGate(detail.modules), [detail])

  const rowByUserId = useMemo(() => {
    const m = new Map<string, UnifiedParticipantRow>()
    for (const r of unifiedParticipants) m.set(r.userId, r)
    return m
  }, [unifiedParticipants])

  const projectPlacementsAll = useMemo((): ProjectPlacement[] => {
    const out: ProjectPlacement[] = []
    for (let i = 0; i < linkedPids.length; i++) {
      const pid = linkedPids[i]
      const rq = memberQueries[i]
      const pname = projectMap.get(pid) ?? `${pid.slice(0, 8)}…`
      for (const mem of rq?.data?.data ?? []) {
        out.push({ projectId: pid, projectName: pname, userId: mem.user_id, role: mem.role })
      }
    }
    return out
  }, [linkedPids, memberQueries, projectMap])

  const searchMatchedUserIds = useMemo(
    () => new Set(filteredUnified.map((r) => r.userId)),
    [filteredUnified],
  )

  const projectSections = useMemo(() => {
    const filtered = projectPlacementsAll.filter((p) => searchMatchedUserIds.has(p.userId))
    const m = new Map<string, { projectName: string; items: ProjectPlacement[] }>()
    for (const pl of filtered) {
      if (!m.has(pl.projectId)) m.set(pl.projectId, { projectName: pl.projectName, items: [] })
      m.get(pl.projectId)!.items.push(pl)
    }
    return [...m.entries()].sort((a, b) =>
      a[1].projectName.localeCompare(b[1].projectName, 'es', { sensitivity: 'base' }),
    )
  }, [projectPlacementsAll, searchMatchedUserIds])

  const orphanFilteredRows = useMemo(
    () => filteredUnified.filter((r) => !rosterByUserId.has(r.userId)),
    [filteredUnified, rosterByUserId],
  )

  return (
    <Card className="rounded-2xl shadow-sm border overflow-hidden">
      <CardHeader className="pb-2 px-4 sm:px-6 pt-4 sm:pt-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <Users className="w-4 h-4 shrink-0 text-primary" />
            Participantes
          </CardTitle>

          {participantIsSuccess && !participationLoading && (
            <div className="flex flex-wrap gap-1.5">
              <StatChip color="green">{totalResponses} respondieron</StatChip>
              {pendingInLinkedProjects != null && pendingInLinkedProjects > 0 && (
                <StatChip color="amber">
                  {pendingInLinkedProjects} pendiente{pendingInLinkedProjects !== 1 && 's'}
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

      {participantIsError && (
        <ErrorBanner
          message={participantError instanceof ApiError ? participantError.message : 'No se pudieron cargar las respuestas.'}
        />
      )}

      {participantIsSuccess && !participationLoading && (
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
          {filteredUnified.length > 0 && linkedPids.length === 0 && (
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
          {filteredUnified.length > 0 && linkedPids.length > 0 && (
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
                  <div key={projId} className="rounded-2xl border bg-card overflow-hidden shadow-sm">
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
                          <StatChip color="neutral">{section.items.length} miembros</StatChip>
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
                            linkedPidsForEventLength={linkedPids.length}
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
                  <Accordion type="multiple" className="divide-y divide-border/60 bg-background/60">
                    {orphanFilteredRows.map((row) => (
                      <ParticipantRowAccordionInner
                        key={`orph_${row.userId}`}
                        row={row}
                        accordionValue={`orph_${row.userId}`}
                        linkedPidsForEventLength={linkedPids.length}
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
  )
}
