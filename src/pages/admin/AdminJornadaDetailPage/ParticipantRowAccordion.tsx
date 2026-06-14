import { AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Badge } from '@/components/ui/badge'
import type { AttendanceGate } from '@/features/events/lib/attendanceGate'
import { attendanceStatusFromAnswers, attendanceStatusLabel } from '@/features/events/lib/attendanceGate'
import { formatStartsAR } from '@/features/events/lib/deadline'
import { labelProjectRole } from '@/features/events/lib/eventLabels'
import {
  attendanceBadgeClass,
  groupAnswersByModule,
  type AnswerMaps,
  type UnifiedParticipantRow,
} from '@/features/events/lib/jornadaDetail'
import { cn, getInitials } from '@/lib/utils'

export function ParticipantRowAccordionInner({
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
