import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
      <header className="bg-primary text-primary-foreground p-4 pt-6 safe-area-top">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary-foreground/20">
            <UtensilsCrossed className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Comidas</h1>
            <p className="text-sm opacity-80">Reservá tu lugar para el día elegido</p>
          </div>
        </div>
      </header>

      <div className="p-4 space-y-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Fecha</CardTitle>
            <CardDescription>Mostramos comidas publicadas para la fecha que elijas.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Label htmlFor="meal-date" className="text-xs text-muted-foreground">
              Día del evento
            </Label>
            <Input
              id="meal-date"
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </CardContent>
        </Card>

        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
          <Clock className="w-4 h-4 shrink-0" />
          <span>
            {getTimeRemaining(deadlineIso)} para reservar (cierra la víspera del evento a las 23:59 AR)
          </span>
        </div>

        {actionError && (
          <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">{actionError}</p>
        )}

        {mealsQuery.isLoading && <p className="text-sm text-muted-foreground">Cargando comidas…</p>}
        {mealsQuery.isError && (
          <p className="text-sm text-destructive">
            {mealsQuery.error instanceof ApiError
              ? mealsQuery.error.message
              : 'No se pudieron cargar las comidas.'}
          </p>
        )}

        {!mealsQuery.isLoading && !mealsQuery.isError && sortedMeals.length === 0 && (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              No hay comidas publicadas para {formatEventDateAR(selectedDate)}.
            </CardContent>
          </Card>
        )}

        {sortedMeals.map((meal) => {
          // Lista = GET ?date=selectedDate: el día mostrado es el elegido, no meal.date crudo
          // (en DB puede ser 26 00:00 UTC = 25 a la noche AR; evita “elegí 25 y dice 26”).
          const open = isMealBookingOpen(selectedDate)
          const bookingId = bookingForMeal(meal.id, bookingsQuery.data?.data)
          const reserved = Boolean(bookingId)
          const canReserve = !reserved && !meal.sold_out && open

          return (
            <Card key={meal.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-lg leading-tight">{meal.title}</CardTitle>
                    <CardDescription className="flex flex-wrap items-center gap-2 mt-1">
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatEventDateAR(selectedDate)}
                      </span>
                      <Badge variant="outline" className="text-[10px]">
                        {meal.type === 'almuerzo' ? 'Almuerzo' : meal.type === 'cena' ? 'Cena' : meal.type}
                      </Badge>
                      <Badge variant="secondary" className="text-[10px]">
                        {meal.category.replace(/_/g, ' ')}
                      </Badge>
                    </CardDescription>
                  </div>
                  {reserved && (
                    <Badge className="shrink-0 bg-success text-success-foreground">Reservado</Badge>
                  )}
                  {!reserved && meal.sold_out && <Badge variant="destructive">Agotado</Badge>}
                  {!reserved && !meal.sold_out && !open && <Badge variant="secondary">Cerrado</Badge>}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {meal.image_url ? (
                  <img
                    src={meal.image_url}
                    alt=""
                    className="w-full max-h-40 object-cover rounded-md border"
                  />
                ) : null}
                {meal.description ? (
                  <p className="text-sm text-muted-foreground">{meal.description}</p>
                ) : null}
                <p className="text-xs text-muted-foreground">
                  {meal.sold_out ? 'Sin cupos' : `${meal.available_count} lugares disponibles`}
                </p>

                {!reserved && (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      className="flex-1 min-w-[8rem]"
                      disabled={!canReserve || bookMutation.isPending}
                      onClick={() => bookMutation.mutate(meal.id)}
                    >
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Reservar
                    </Button>
                  </div>
                )}

                {reserved && bookingId && (
                  <Button
                    variant="outline"
                    className="w-full border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
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

        {bookingsForDate.length > 0 && (
          <Card className="bg-muted/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Tus reservas para este día</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {bookingsForDate.map((b) => (
                <div key={b.id} className="flex justify-between gap-2 border-b border-border/50 pb-2 last:border-0">
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

        <Card className="bg-muted/30">
          <CardContent className="p-4">
            <h3 className="font-medium text-sm mb-2">Información</h3>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• Una reserva por tipo de comida y categoría para el mismo día (regla del servidor).</li>
              <li>• Si reservás otra opción compatible, la anterior se reemplaza automáticamente.</li>
              <li>• Consultá con coordinación si tenés restricciones alimentarias.</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      <AlertDialog
        open={Boolean(cancelBookingId)}
        onOpenChange={(open) => {
          if (!open) setCancelBookingId(null)
        }}
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
