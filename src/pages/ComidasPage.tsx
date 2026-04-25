import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { UtensilsCrossed, Clock, Calendar, CheckCircle2, XCircle } from 'lucide-react'
import { getTimeRemaining } from '@/lib/mock-data'
import { useAuth } from '@/hooks/useAuth'
import { listMealsByDate } from '@/lib/api/meals'
import { bookMeal, cancelBooking, listMyBookings } from '@/lib/api/bookings'
import { ApiError } from '@/lib/api/apiClient'
import type { MealDTO } from '@/lib/api/types'
import {
  bookingDeadlineIsoForMealYmd,
  formatEventDateAR,
  isMealBookingOpen,
  todayMealYmd,
} from '@/lib/meal-utils'
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

function bookingForMeal(
  mealId: string,
  bookings: { id: string; meal_id: string }[] | undefined,
): string | undefined {
  return bookings?.find((b) => b.meal_id === mealId)?.id
}

export default function ComidasPage() {
  const queryClient = useQueryClient()
  const { token, isRestoring } = useAuth()
  const defaultDate = useMemo(() => todayMealYmd(), [])
  const [selectedDate, setSelectedDate] = useState(defaultDate)
  const [cancelBookingId, setCancelBookingId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const mealsQuery = useQuery({
    queryKey: ['meals', selectedDate],
    queryFn: () => listMealsByDate(token!, selectedDate),
    enabled: Boolean(token) && !isRestoring,
  })

  const bookingsQuery = useQuery({
    queryKey: ['my-bookings'],
    queryFn: () => listMyBookings(token!),
    enabled: Boolean(token) && !isRestoring,
  })

  const bookMutation = useMutation({
    mutationFn: (mealId: string) => bookMeal(token!, mealId),
    onSuccess: () => {
      setActionError(null)
      void queryClient.invalidateQueries({ queryKey: ['meals'] })
      void queryClient.invalidateQueries({ queryKey: ['my-bookings'] })
    },
    onError: (err: unknown) => {
      setActionError(err instanceof ApiError ? err.message : 'No se pudo reservar')
    },
  })

  const cancelMutation = useMutation({
    mutationFn: (bookingId: string) => cancelBooking(token!, bookingId),
    onSuccess: () => {
      setActionError(null)
      setCancelBookingId(null)
      void queryClient.invalidateQueries({ queryKey: ['meals'] })
      void queryClient.invalidateQueries({ queryKey: ['my-bookings'] })
    },
    onError: (err: unknown) => {
      setActionError(err instanceof ApiError ? err.message : 'No se pudo cancelar')
    },
  })

  const sortedMeals = useMemo(() => {
    const list: MealDTO[] = mealsQuery.data?.data ?? []
    return [...list].sort((a, b) => {
      const ta = a.type === 'almuerzo' ? 0 : 1
      const tb = b.type === 'almuerzo' ? 0 : 1
      if (ta !== tb) return ta - tb
      return a.title.localeCompare(b.title, 'es')
    })
  }, [mealsQuery.data?.data])

  const deadlineIso = bookingDeadlineIsoForMealYmd(selectedDate)
  const mealIdsForSelectedDay = useMemo(() => new Set(sortedMeals.map((m) => m.id)), [sortedMeals])
  const bookingsForDate =
    bookingsQuery.data?.data.filter((b) => b.meal_id && mealIdsForSelectedDay.has(b.meal_id)) ?? []

  return (
    <div className="min-h-screen">
      <PageHeader icon={UtensilsCrossed} title="Comidas" subtitle="Reservá tu lugar para el día elegido" />

      <div className="p-4 lg:p-6 max-w-3xl mx-auto space-y-4">

        {/* Date picker */}
        <Card className="shadow-sm">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-semibold">Seleccioná una fecha</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-2">
            <Label htmlFor="meal-date" className="text-xs text-muted-foreground">
              Día del evento
            </Label>
            <Input
              id="meal-date"
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="h-10"
            />
          </CardContent>
        </Card>

        {/* Deadline banner */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 border border-border px-3 py-2.5 rounded-lg">
          <Clock className="w-3.5 h-3.5 shrink-0 text-warning-foreground" />
          <span>
            <span className="font-medium text-foreground">{getTimeRemaining(deadlineIso)}</span>
            {' '}para reservar · cierra la víspera a las 23:59 (AR)
          </span>
        </div>

        {/* Error */}
        {actionError && (
          <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2.5 border border-destructive/20">
            {actionError}
          </p>
        )}

        {/* Loading / empty states */}
        {mealsQuery.isLoading && (
          <p className="text-sm text-muted-foreground py-6 text-center">Cargando comidas…</p>
        )}
        {mealsQuery.isError && (
          <p className="text-sm text-destructive py-4">
            {mealsQuery.error instanceof ApiError
              ? mealsQuery.error.message
              : 'No se pudieron cargar las comidas.'}
          </p>
        )}

        {!mealsQuery.isLoading && !mealsQuery.isError && sortedMeals.length === 0 && (
          <Card className="shadow-sm">
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              <UtensilsCrossed className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
              No hay comidas publicadas para{' '}
              <span className="font-medium text-foreground">{formatEventDateAR(selectedDate)}</span>.
            </CardContent>
          </Card>
        )}

        {/* Meals */}
        {sortedMeals.map((meal) => {
          const open = isMealBookingOpen(selectedDate)
          const bookingId = bookingForMeal(meal.id, bookingsQuery.data?.data)
          const reserved = Boolean(bookingId)
          const canReserve = !reserved && !meal.sold_out && open

          return (
            <Card key={meal.id} className="overflow-hidden shadow-sm">
              {meal.image_url && (
                <img
                  src={meal.image_url}
                  alt=""
                  className="w-full h-36 object-cover"
                />
              )}
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-base leading-snug">{meal.title}</h3>
                    <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        {formatEventDateAR(selectedDate)}
                      </span>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        {meal.type === 'almuerzo' ? 'Almuerzo' : meal.type === 'cena' ? 'Cena' : meal.type}
                      </Badge>
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                        {meal.category.replace(/_/g, ' ')}
                      </Badge>
                    </div>
                  </div>
                  <div className="shrink-0">
                    {reserved && (
                      <Badge className="bg-success/15 text-success border-success/25 hover:bg-success/20">
                        Reservado
                      </Badge>
                    )}
                    {!reserved && meal.sold_out && <Badge variant="destructive">Agotado</Badge>}
                    {!reserved && !meal.sold_out && !open && (
                      <Badge variant="secondary">Cerrado</Badge>
                    )}
                  </div>
                </div>

                {meal.description && (
                  <p className="text-sm text-muted-foreground leading-relaxed">{meal.description}</p>
                )}

                <p className="text-xs text-muted-foreground">
                  {meal.sold_out ? 'Sin cupos disponibles' : `${meal.available_count} lugares disponibles`}
                </p>

                {!reserved && (
                  <Button
                    className="w-full"
                    disabled={!canReserve || bookMutation.isPending}
                    onClick={() => bookMutation.mutate(meal.id)}
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Reservar
                  </Button>
                )}

                {reserved && bookingId && (
                  <Button
                    variant="outline"
                    className="w-full border-destructive/50 text-destructive hover:bg-destructive hover:text-destructive-foreground hover:border-destructive"
                    disabled={!open || cancelMutation.isPending}
                    onClick={() => setCancelBookingId(bookingId)}
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Cancelar reserva
                  </Button>
                )}
              </CardContent>
            </Card>
          )
        })}

        {/* Summary of reservations for this day */}
        {bookingsForDate.length > 0 && (
          <Card className="shadow-sm">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm font-semibold">Tus reservas para este día</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-2 text-sm">
              {bookingsForDate.map((b) => (
                <div
                  key={b.id}
                  className="flex justify-between gap-2 border-b border-border/50 pb-2 last:border-0 last:pb-0"
                >
                  <span className="font-medium">{b.meal?.title ?? b.meal_id}</span>
                  <span className="text-muted-foreground text-xs">
                    {b.meal?.type === 'almuerzo'
                      ? 'Almuerzo'
                      : b.meal?.type === 'cena'
                        ? 'Cena'
                        : (b.meal?.type ?? '')}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Info */}
        <div className="bg-muted/40 border border-border rounded-xl p-4">
          <h3 className="font-semibold text-sm mb-2">Información</h3>
          <ul className="text-xs text-muted-foreground space-y-1.5">
            <li className="flex items-start gap-2">
              <span className="text-muted-foreground/50 shrink-0">•</span>
              Una reserva por tipo de comida y categoría para el mismo día.
            </li>
            <li className="flex items-start gap-2">
              <span className="text-muted-foreground/50 shrink-0">•</span>
              Si reservás otra opción compatible, la anterior se reemplaza automáticamente.
            </li>
            <li className="flex items-start gap-2">
              <span className="text-muted-foreground/50 shrink-0">•</span>
              Consultá con coordinación si tenés restricciones alimentarias.
            </li>
          </ul>
        </div>
      </div>

      <AlertDialog
        open={Boolean(cancelBookingId)}
        onOpenChange={(open) => { if (!open) setCancelBookingId(null) }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Cancelar la reserva?</AlertDialogTitle>
            <AlertDialogDescription>
              Liberás tu cupo. Podés volver a reservar mientras el plazo esté abierto y haya lugar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelMutation.isPending}>Volver</AlertDialogCancel>
            <AlertDialogAction
              disabled={cancelMutation.isPending}
              className="bg-destructive hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault()
                if (cancelBookingId) cancelMutation.mutate(cancelBookingId)
              }}
            >
              Cancelar reserva
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
