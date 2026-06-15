import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Loader2, Send } from 'lucide-react'

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
import { DeadlineBadge } from '@/features/events/components/DeadlineBadge'
import { ResponseModuleCard } from '@/features/events/components/ResponseModuleCard'
import { useEventRespondPage } from '@/features/events/hooks/useEventRespondPage'
import { formatStartsAR } from '@/features/events/lib/deadline'
import { ApiError } from '@/lib/api/apiClient'
import { useAuth } from '@/hooks/useAuth'

export default function EventRespondPage() {
  const { id: eventId } = useParams<{ id: string }>()
  const { token, user, isRestoring } = useAuth()

  const {
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
    isSubmitting,
  } = useEventRespondPage({
    eventId,
    token,
    userId: user?.id,
    isRestoring,
  })

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
          <Button className="w-full h-11" disabled={busy} onClick={submit}>
            {isSubmitting ? (
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
