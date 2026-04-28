import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { UtensilsCrossed, Clock, Calendar, CheckCircle2, XCircle, Sun, Moon, AlertCircle } from 'lucide-react'
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
  nextSaturdayYmd,
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

const CATEGORY_LABELS: Record<string, string> = {
  pastas: 'Pastas',
  milanesas: 'Milanesas',
  ensaladas: 'Ensaladas',
  sandwiches_y_wraps: 'Sandwiches y wraps',
  pollo: 'Pollo',
  carne: 'Carne',
}

interface MealCardProps {
  meal: MealDTO
  selectedDate: string
  bookings: { id: string; meal_id: string }[] | undefined
  onBook: (mealId: string) => void
  onCancelRequest: (bookingId: string) => void
  isBookPending: boolean
  isCancelPending: boolean
}

function MealCard({
  meal,
  selectedDate,
  bookings,
  onBook,
  onCancelRequest,
  isBookPending,
  isCancelPending,
}: MealCardProps) {
  const open = isMealBookingOpen(selectedDate)
  const bookingId = bookingForMeal(meal.id, bookings)
  const reserved = Boolean(bookingId)
  const canReserve = !reserved && !meal.sold_out && open

  return (
    <div
      className={`relative rounded-2xl overflow-hidden border-2 bg-card transition-all duration-200 ${
        reserved
          ? 'border-emerald-400/60 shadow-md shadow-emerald-100/60 dark:shadow-emerald-900/20'
          : meal.sold_out
            ? 'border-border opacity-60'
            : 'border-border hover:border-primary/40 hover:shadow-md'
      }`}
    >
      {/* Status badge */}
      {reserved && (
        <div className="absolute top-3 right-3 z-10">
          <span className="flex items-center gap-1 bg-emerald-500 text-white text-[11px] font-bold px-2.5 py-1 rounded-full shadow-sm">
            <CheckCircle2 className="w-3 h-3" /> Reservado
          </span>
        </div>
      )}
      {!reserved && meal.sold_out && (
        <div className="absolute top-3 right-3 z-10">
          <span className="bg-destructive text-destructive-foreground text-[11px] font-bold px-2.5 py-1 rounded-full shadow-sm">
            Agotado
          </span>
        </div>
      )}
      {!reserved && !meal.sold_out && !open && (
        <div className="absolute top-3 right-3 z-10">
          <span className="bg-muted text-muted-foreground text-[11px] font-semibold px-2.5 py-1 rounded-full border">
            Cerrado
          </span>
        </div>
      )}

      {/* Image */}
      {meal.image_url ? (
        <div className="relative h-40 overflow-hidden">
          <img
            src={meal.image_url}
            alt={meal.title}
            className={`w-full h-full object-cover transition-all ${meal.sold_out ? 'grayscale' : ''}`}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/25 to-transparent" />
        </div>
      ) : (
        <div className="h-16 bg-gradient-to-br from-muted/80 to-muted flex items-center justify-center">
          <UtensilsCrossed className="w-6 h-6 text-muted-foreground/30" />
        </div>
      )}

      {/* Content */}
      <div className="p-4 space-y-3">
        <div>
          <h3 className="font-bold text-base leading-snug">{meal.title}</h3>
          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
            <Badge variant="secondary" className="text-[10px] px-2 py-0.5 rounded-full">
              {CATEGORY_LABELS[meal.category] ?? meal.category.replace(/_/g, ' ')}
            </Badge>
            {!meal.sold_out && (
              <span className="text-[10px] text-muted-foreground tabular-nums">
                {meal.available_count} disponibles
              </span>
            )}
          </div>
        </div>

        {meal.description && (
          <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
            {meal.description}
          </p>
        )}

        <div className="pt-0.5">
          {!reserved ? (
            <Button
              className="w-full h-9"
              variant={canReserve ? 'default' : 'secondary'}
              disabled={!canReserve || isBookPending}
              onClick={() => onBook(meal.id)}
            >
              {isBookPending ? (
                'Reservando...'
              ) : !open ? (
                'Reserva cerrada'
              ) : meal.sold_out ? (
                'Sin cupos'
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                  Reservar
                </>
              )}
            </Button>
          ) : (
            <Button
              variant="ghost"
              className="w-full h-9 text-destructive hover:bg-destructive/10 hover:text-destructive"
              disabled={!open || isCancelPending}
              onClick={() => onCancelRequest(bookingId!)}
            >
              <XCircle className="w-3.5 h-3.5 mr-1.5" />
              Cancelar reserva
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

function MealSection({
  title,
  icon: Icon,
  iconClass,
  meals,
  ...cardProps
}: {
  title: string
  icon: React.ElementType
  iconClass: string
  meals: MealDTO[]
} & Omit<MealCardProps, 'meal'>) {
  return (
    <section>
      <div className="flex items-center gap-2.5 mb-4">
        <Icon className={`w-4 h-4 ${iconClass} shrink-0`} />
        <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{title}</h2>
        <div className="h-px flex-1 bg-border" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {meals.map((meal) => (
          <MealCard key={meal.id} meal={meal} {...cardProps} />
        ))}
      </div>
    </section>
  )
}

export default function ComidasPage() {
  const queryClient = useQueryClient()
  const { token, isRestoring } = useAuth()
  const defaultDate = useMemo(() => nextSaturdayYmd(), [])
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

  const almuerzoMeals = useMemo(() => sortedMeals.filter((m) => m.type === 'almuerzo'), [sortedMeals])
  const cenaMeals = useMemo(() => sortedMeals.filter((m) => m.type !== 'almuerzo'), [sortedMeals])

  const deadlineIso = bookingDeadlineIsoForMealYmd(selectedDate)
  const bookingOpen = isMealBookingOpen(selectedDate)
  const deadlineMs = new Date(deadlineIso).getTime() - Date.now()
  const isUrgent = bookingOpen && deadlineMs < 3 * 60 * 60 * 1000

  const mealIdsForSelectedDay = useMemo(() => new Set(sortedMeals.map((m) => m.id)), [sortedMeals])
  const bookingsForDate =
    bookingsQuery.data?.data.filter((b) => b.meal_id && mealIdsForSelectedDay.has(b.meal_id)) ?? []

  const sharedCardProps = {
    selectedDate,
    bookings: bookingsQuery.data?.data,
    onBook: (mealId: string) => bookMutation.mutate(mealId),
    onCancelRequest: setCancelBookingId,
    isBookPending: bookMutation.isPending,
    isCancelPending: cancelMutation.isPending,
  }

  return (
    <div className="min-h-screen">
      <PageHeader icon={UtensilsCrossed} title="Comidas" subtitle="Reservá tu lugar para el día elegido" />

      <div className="p-4 lg:p-6 max-w-3xl mx-auto space-y-5">

        {/* Date picker + deadline */}
        <div className="flex gap-3 flex-wrap">
          <label className="flex items-center gap-2 flex-1 min-w-[180px] bg-card border border-border rounded-xl px-3 py-2.5 cursor-pointer hover:border-primary/40 transition-colors">
            <Calendar className="w-4 h-4 text-muted-foreground shrink-0" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="text-sm bg-transparent outline-none text-foreground cursor-pointer w-full"
            />
          </label>

          {bookingOpen ? (
            <div
              className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-medium shrink-0 border ${
                isUrgent
                  ? 'bg-destructive/10 text-destructive border-destructive/25'
                  : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800/40'
              }`}
            >
              <Clock className="w-3.5 h-3.5 shrink-0" />
              <span>{getTimeRemaining(deadlineIso)} para reservar</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-medium shrink-0 bg-muted text-muted-foreground border border-border">
              <Clock className="w-3.5 h-3.5 shrink-0" />
              <span>Reservas cerradas</span>
            </div>
          )}
        </div>

        {/* Action error */}
        {actionError && (
          <div className="flex items-start gap-2.5 text-sm text-destructive bg-destructive/10 rounded-xl px-4 py-3 border border-destructive/20">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{actionError}</span>
          </div>
        )}

        {/* Skeleton loading */}
        {mealsQuery.isLoading && (
          <div className="space-y-4">
            {[0, 1].map((i) => (
              <div key={i} className="rounded-2xl border-2 border-border overflow-hidden animate-pulse">
                <div className="h-40 bg-muted" />
                <div className="p-4 space-y-3">
                  <div className="h-4 bg-muted rounded-lg w-3/5" />
                  <div className="h-3 bg-muted rounded-lg w-2/5" />
                  <div className="h-9 bg-muted rounded-xl mt-2" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* API error */}
        {mealsQuery.isError && !mealsQuery.isLoading && (
          <Card>
            <CardContent className="py-10 text-center text-sm text-destructive">
              {mealsQuery.error instanceof ApiError
                ? mealsQuery.error.message
                : 'No se pudieron cargar las comidas.'}
            </CardContent>
          </Card>
        )}

        {/* Empty state */}
        {!mealsQuery.isLoading && !mealsQuery.isError && sortedMeals.length === 0 && (
          <Card>
            <CardContent className="py-16 text-center">
              <UtensilsCrossed className="w-12 h-12 mx-auto text-muted-foreground/20 mb-4" />
              <p className="font-semibold">Sin comidas para este día</p>
              <p className="text-sm text-muted-foreground mt-1">
                No hay menús publicados para {formatEventDateAR(selectedDate)}.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Almuerzo */}
        {almuerzoMeals.length > 0 && (
          <MealSection
            title="Almuerzo"
            icon={Sun}
            iconClass="text-amber-500"
            meals={almuerzoMeals}
            {...sharedCardProps}
          />
        )}

        {/* Cena */}
        {cenaMeals.length > 0 && (
          <MealSection
            title="Cena"
            icon={Moon}
            iconClass="text-indigo-500"
            meals={cenaMeals}
            {...sharedCardProps}
          />
        )}

        {/* Reservations summary */}
        {bookingsForDate.length > 0 && (
          <div className="bg-emerald-50/80 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 rounded-2xl p-4">
            <h3 className="font-semibold text-sm text-emerald-800 dark:text-emerald-300 mb-3 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              Tus reservas · {formatEventDateAR(selectedDate)}
            </h3>
            <div className="space-y-2">
              {bookingsForDate.map((b) => (
                <div key={b.id} className="flex items-center justify-between text-sm">
                  <span className="font-medium text-emerald-900 dark:text-emerald-200">
                    {b.meal?.title ?? b.meal_id}
                  </span>
                  <Badge
                    variant="outline"
                    className="text-[10px] rounded-full border-emerald-300 text-emerald-700 dark:border-emerald-700 dark:text-emerald-400 bg-white dark:bg-transparent"
                  >
                    {b.meal?.type === 'almuerzo'
                      ? 'Almuerzo'
                      : b.meal?.type === 'cena'
                        ? 'Cena'
                        : (b.meal?.type ?? '')}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Info */}
        <div className="bg-muted/40 border border-border rounded-xl p-4">
          <h3 className="font-semibold text-sm mb-2.5">Información</h3>
          <ul className="text-xs text-muted-foreground space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-muted-foreground/40 shrink-0 mt-0.5">•</span>
              Una reserva por tipo de comida y categoría para el mismo día.
            </li>
            <li className="flex items-start gap-2">
              <span className="text-muted-foreground/40 shrink-0 mt-0.5">•</span>
              Si reservás otra opción compatible, la anterior se reemplaza automáticamente.
            </li>
            <li className="flex items-start gap-2">
              <span className="text-muted-foreground/40 shrink-0 mt-0.5">•</span>
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
