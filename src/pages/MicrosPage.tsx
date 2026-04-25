import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
  Calendar
} from 'lucide-react'
import { 
  micros as initialMicros, 
  formatDate, 
  getTimeRemaining,
  type Micro 
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

export default function MicrosPage() {
  const [micros, setMicros] = useState<Micro[]>(initialMicros)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedMicro, setSelectedMicro] = useState<Micro | null>(null)
  const [actionType, setActionType] = useState<'reserve' | 'cancel'>('reserve')

  const handleReserve = (micro: Micro) => {
    setSelectedMicro(micro)
    setActionType('reserve')
    setDialogOpen(true)
  }

  const handleCancel = (micro: Micro) => {
    setSelectedMicro(micro)
    setActionType('cancel')
    setDialogOpen(true)
  }

  const confirmAction = () => {
    if (!selectedMicro) return

    setMicros(prev => prev.map(m => {
      if (m.id === selectedMicro.id) {
        if (actionType === 'reserve') {
          return { ...m, userReserved: true, reservedSeats: m.reservedSeats + 1 }
        } else {
          return { ...m, userReserved: false, reservedSeats: m.reservedSeats - 1 }
        }
      }
      return m
    }))
    setDialogOpen(false)
  }

  const userHasReservation = micros.some(m => m.userReserved)

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-primary text-primary-foreground p-4 pt-6 safe-area-top">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary-foreground/20">
            <Bus className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Micros</h1>
            <p className="text-sm opacity-80">Reservá tu lugar para el sábado</p>
          </div>
        </div>
      </header>

      <div className="p-4 space-y-4">
        {/* User status */}
        {userHasReservation && (
          <Card className="border-success/30 bg-success/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-success/20">
                  <CheckCircle2 className="w-5 h-5 text-success" />
                </div>
                <div>
                  <p className="font-medium text-success">¡Tenés lugar reservado!</p>
                  <p className="text-sm text-muted-foreground">
                    Tu lugar está confirmado para este sábado
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Micros list */}
        <div className="space-y-4">
          {micros.map((micro) => {
            const availableSeats = micro.totalSeats - micro.reservedSeats
            const occupancyPercent = (micro.reservedSeats / micro.totalSeats) * 100
            const isAlmostFull = occupancyPercent >= 80
            const isFull = availableSeats === 0

            return (
              <Card key={micro.id} className="overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Bus className="w-5 h-5 text-primary" />
                        Micro {micro.id.split('-')[1]}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-1 mt-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(micro.date)}
                      </CardDescription>
                    </div>
                    {micro.userReserved ? (
                      <Badge className="bg-success text-success-foreground">
                        Reservado
                      </Badge>
                    ) : isFull ? (
                      <Badge variant="secondary">Completo</Badge>
                    ) : isAlmostFull ? (
                      <Badge variant="destructive">Últimos lugares</Badge>
                    ) : (
                      <Badge variant="outline">Disponible</Badge>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Details */}
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="w-4 h-4" />
                      <span className="truncate">{micro.destination}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      <span>{micro.departureTime} - {micro.returnTime}</span>
                    </div>
                  </div>

                  {/* Capacity */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-muted-foreground" />
                        <span>{micro.reservedSeats} / {micro.totalSeats} lugares</span>
                      </div>
                      <span className={`font-medium ${
                        isFull ? 'text-destructive' : 
                        isAlmostFull ? 'text-warning-foreground' : 
                        'text-success'
                      }`}>
                        {availableSeats} disponibles
                      </span>
                    </div>
                    <Progress 
                      value={occupancyPercent} 
                      className="h-2"
                    />
                  </div>

                  {/* Time remaining */}
                  <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 p-2 rounded-lg">
                    <AlertCircle className="w-4 h-4" />
                    <span>{getTimeRemaining(micro.reservationDeadline)} para reservar</span>
                  </div>

                  {/* Action button */}
                  {micro.userReserved ? (
                    <Button 
                      variant="outline" 
                      className="w-full border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                      onClick={() => handleCancel(micro)}
                    >
                      Cancelar reserva
                    </Button>
                  ) : (
                    <Button 
                      className="w-full"
                      disabled={isFull || userHasReservation}
                      onClick={() => handleReserve(micro)}
                    >
                      {isFull ? 'Sin lugares disponibles' : 
                       userHasReservation ? 'Ya tenés reserva' :
                       'Reservar mi lugar'}
                    </Button>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Info card */}
        <Card className="bg-muted/30">
          <CardContent className="p-4">
            <h3 className="font-medium text-sm mb-2">Información importante</h3>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• El micro sale puntual, llegá 10 minutos antes</li>
              <li>• Punto de encuentro: Sede central</li>
              <li>• Cancelá tu reserva si no vas a asistir</li>
              <li>• Consultas: contactá a tu coordinador</li>
            </ul>
          </CardContent>
        </Card>
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
                : 'Tu lugar quedará disponible para otro madrij. Podés volver a reservar mientras haya lugares disponibles.'
              }
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
