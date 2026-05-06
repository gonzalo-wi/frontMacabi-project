import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Bus,
  Clock,
  MapPin,
  Users,
  CheckCircle2,
  AlertCircle,
  Calendar,
} from 'lucide-react'
import {
  micros as initialMicros,
  formatDate,
  getTimeRemaining,
} from '@/lib/mock-data'
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
import { PageHeader } from '@/components/PageHeader'
import { cn } from '@/lib/utils'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { confirmAttendance, getAttendanceCount } from '@/lib/api/attendance'
import { ApiError } from '@/lib/api/apiClient'

// TODO: reemplazar por el ID real del micro cuando el módulo esté en el back
const MICRO_PROJECT_ID = '5e75315d-788c-4f82-8e0b-1bf6f403bb2b'

export default function MicrosPage() {
  const micros = initialMicros
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedMicro, setSelectedMicro] = useState<typeof initialMicros[0] | null>(null)
  const [actionType, setActionType] = useState<'reserve' | 'cancel'>('reserve')
  const { token } = useAuth()
  const queryClient = useQueryClient()
  const [bannerMicroId, setBannerMicroId] = useState<string | null>(null)


const attendanceQuery = useQuery({
  queryKey: ['attendance', MICRO_PROJECT_ID],
  queryFn: () => getAttendanceCount(token!, MICRO_PROJECT_ID),
  enabled: Boolean(token),
})

const confirmMutation = useMutation({
  mutationFn: () => confirmAttendance(token!, MICRO_PROJECT_ID),
  onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['attendance', MICRO_PROJECT_ID] })
      setConfirmedMicroIds(prev => {
        const next = new Set(prev)
        next.add(selectedMicro?.id ?? '')
        return next
      })
      localStorage.setItem(
        `attendance-confirmed-${MICRO_PROJECT_ID}`,
        JSON.stringify([...confirmedMicroIds, selectedMicro?.id])
      )
      setBannerMicroId(selectedMicro?.id ?? null)
      setTimeout(() => setBannerMicroId(null), 3000)
  },
  onError: (error: unknown) => {
    if (error instanceof ApiError && error.status === 409) {
      setConfirmedMicroIds(prev => {
        const next = new Set(prev)
        next.add(selectedMicro?.id ?? '')
        return next
      })
      localStorage.setItem(
        `attendance-confirmed-${MICRO_PROJECT_ID}`,
        JSON.stringify([...confirmedMicroIds, selectedMicro?.id])
      )
      setBannerMicroId(selectedMicro?.id ?? null)
      setTimeout(() => setBannerMicroId(null), 3000)
    }
  },
})

const [confirmedMicroIds, setConfirmedMicroIds] = useState<Set<string>>(
  () => {
    const stored = localStorage.getItem(`attendance-confirmed-${MICRO_PROJECT_ID}`)
    return stored ? new Set(JSON.parse(stored)) : new Set()
  }
)
const alreadyConfirmed = (microId: string) => confirmedMicroIds.has(microId)

const confirmedCount = attendanceQuery.data?.confirmed ?? 0

  const handleReserve = (micro: typeof initialMicros[0]) => {
    setSelectedMicro(micro)
    setActionType('reserve')
    setDialogOpen(true)
  }

  const handleCancel = (micro: typeof initialMicros[0]) => {
    setSelectedMicro(micro)
    setActionType('cancel')
    setDialogOpen(true)
  }

  const confirmAction = () => {
    if (!selectedMicro) return
    if (actionType === 'cancel') {
      localStorage.removeItem(`attendance-confirmed-${MICRO_PROJECT_ID}`)
      setConfirmedMicroIds(prev => {
          const next = new Set(prev)
          next.delete(selectedMicro.id)
          return next
        })
        localStorage.setItem(
          `attendance-confirmed-${MICRO_PROJECT_ID}`,
          JSON.stringify([...confirmedMicroIds].filter(id => id !== selectedMicro.id))
        )
      setDialogOpen(false)
      return
    }
    confirmMutation.mutate()
    setDialogOpen(false)
  }

  return (
    <div className="min-h-screen">
      <PageHeader icon={Bus} title="Micros" subtitle="Reservá tu lugar para el sábado" />

      <div className="p-4 lg:p-6 max-w-3xl mx-auto space-y-4">

        {/* Micros list */}
          {bannerMicroId && (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-success/8 border border-success/25">
              <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
              <p className="text-sm font-semibold text-success">
                ¡Confirmaste tu asistencia al Micro {bannerMicroId.split('-')[1]}!
              </p>
            </div>
          )}
        <div className="space-y-3">
          {micros.map((micro) => {
            const availableSeats = micro.totalSeats - micro.reservedSeats
            const occupancyPercent = (micro.reservedSeats / micro.totalSeats) * 100
            const isAlmostFull = occupancyPercent >= 80
            const isFull = availableSeats === 0

            return (
              <Card key={micro.id} className="overflow-hidden shadow-sm">
                <CardHeader className="pb-3 pt-4 px-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        'p-2.5 rounded-xl shrink-0',
                        alreadyConfirmed(micro.id) ? 'bg-success/15' : 'bg-primary/10',
                      )}>
                        <Bus className={cn(
                          'w-5 h-5',
                          alreadyConfirmed(micro.id) ? 'text-success' : 'text-primary',
                        )} />
                      </div>
                      <div>
                        <CardTitle className="text-base">
                          Micro {micro.id.split('-')[1]}
                        </CardTitle>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Calendar className="w-3 h-3" />
                          {formatDate(micro.date)}
                        </p>
                      </div>
                    </div>
                    {alreadyConfirmed(micro.id) ? (
                      <Badge className="bg-success/15 text-success border-success/25 hover:bg-success/20">
                        Reservado
                      </Badge>
                    ) : isFull ? (
                      <Badge variant="secondary">Completo</Badge>
                    ) : isAlmostFull ? (
                      <Badge className="bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/15">
                        Últimos lugares
                      </Badge>
                    ) : (
                      <Badge variant="outline">Disponible</Badge>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="space-y-3 px-4 pb-4">
                  {/* Details row */}
                  <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{micro.destination}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 shrink-0" />
                      <span>{micro.departureTime} – {micro.returnTime}</span>
                    </div>
                  </div>

                  {/* Capacity */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Users className="w-3.5 h-3.5" />
                        <span>{confirmedCount} / {micro.totalSeats} confirmados</span>
                      </div>
                      <span className={cn(
                        'font-semibold',
                        isFull ? 'text-destructive' :
                        isAlmostFull ? 'text-warning-foreground' :
                        'text-success',
                      )}>
                        {availableSeats} libres
                      </span>
                    </div>
                    <Progress value={occupancyPercent} className="h-1.5" />
                  </div>

                  {/* Deadline */}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 px-3 py-2 rounded-lg">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{getTimeRemaining(micro.reservationDeadline)} para reservar</span>
                  </div>

                  {/* Action */}
                  <Button
                      variant={(alreadyConfirmed(micro.id)) ? 'outline' : 'default'}
                      className={cn(
                        'w-full',
                        (alreadyConfirmed(micro.id)) && 'border-destructive/50 text-destructive hover:bg-destructive hover:text-destructive-foreground hover:border-destructive'
                      )}
                      disabled={confirmMutation.isPending}
                      onClick={() => (alreadyConfirmed(micro.id)) ? handleCancel(micro) : handleReserve(micro)}
                    >
                      {isFull
                        ? 'Sin lugares disponibles'
                        : (alreadyConfirmed(micro.id))
                          ? 'Cancelar mi reserva'
                          : 'Reservar mi lugar'}
                    </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>


        {/* Info card */}
        <div className="bg-muted/40 border border-border rounded-xl p-4">
          <h3 className="font-semibold text-sm mb-2">Información importante</h3>
          <ul className="text-xs text-muted-foreground space-y-1.5">
            <li className="flex items-start gap-2">
              <span className="text-muted-foreground/50 shrink-0">•</span>
              El micro sale puntual, llegá 10 minutos antes
            </li>
            <li className="flex items-start gap-2">
              <span className="text-muted-foreground/50 shrink-0">•</span>
              Punto de encuentro: Sede central
            </li>
            <li className="flex items-start gap-2">
              <span className="text-muted-foreground/50 shrink-0">•</span>
              Cancelá tu reserva si no vas a asistir
            </li>
            <li className="flex items-start gap-2">
              <span className="text-muted-foreground/50 shrink-0">•</span>
              Consultas: contactá a tu coordinador
            </li>
          </ul>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {actionType === 'reserve' ? '¿Confirmar reserva?' : '¿Cancelar reserva?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {actionType === 'reserve'
                ? `Vas a reservar un lugar en el Micro ${selectedMicro?.id.split('-')[1]} para el ${selectedMicro && formatDate(selectedMicro.date)}.`
                : 'Tu lugar quedará disponible para otro madrij. Podés volver a reservar mientras haya lugares disponibles.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Volver</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmAction}
              className={actionType === 'cancel' ? 'bg-destructive hover:bg-destructive/90' : ''}
            >
              {actionType === 'reserve' ? 'Confirmar' : 'Cancelar reserva'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
