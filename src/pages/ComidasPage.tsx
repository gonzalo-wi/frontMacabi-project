import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { UtensilsCrossed, Clock, Calendar, CheckCircle2, XCircle, Sun, Moon, AlertCircle, ArrowLeft, Ban } from 'lucide-react'
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

function mapBookingError(err: unknown): string {
  if (!(err instanceof ApiError)) return 'No se pudo completar la operación'
  const msg = err.message
  if (msg.includes('agotada')) return 'Esta vianda ya no tiene stock disponible'
  if (msg.includes('otro proyecto')) return 'Ya tenés una reserva en otro proyecto para este día. No podés asistir a dos proyectos el mismo día'
  if (msg.includes('almuerzo y cena')) return 'No podés reservar almuerzo y cena para el mismo día'
  if (msg.includes('plazo')) return 'El plazo para reservar ya cerró (viernes 23:59)'
  if (msg.includes('guarnición')) return msg
  return msg
}

interface MealCardProps {
  meal: MealDTO
  selectedDate: string
  bookings: { id: string; meal_id: string }[] | undefined
  onBook: (mealId: string) => void
  onCancelRequest: (bookingId: string) => void
  isBookPending: boolean
  isCancelPending: boolean
  isBlockedByOtherProject: boolean
  isBlockedByType: boolean
}

function MealCard({
  meal,
  selectedDate,
  bookings,
  onBook,
  onCancelRequest,
  isBookPending,
  isCancelPending,
  isBlockedByOtherProject,
  isBlockedByType,
}: MealCardProps) {
  const open = isMealBookingOpen(selectedDate)
  const bookingId = bookingForMeal(meal.id, bookings)
  const reserved = Boolean(bookingId)
  const isBlocked = isBlockedByOtherProject || isBlockedByType
  const canReserve = !reserved && !meal.sold_out && open && !isBlocked

  return (
    <div
      className={`relative rounded-2xl overflow-hidden border-2 bg-card transition-all duration-200 ${
        reserved
          ? 'border-emerald-400/60 shadow-md shadow-emerald-100/60 dark:shadow-emerald-900/20'
          : isBlocked
            ? 'border-border opacity-50'
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
      {!reserved && isBlockedByOtherProject && (
        <div className="absolute top-3 right-3 z-10">
          <span className="flex items-center gap-1 bg-orange-100 text-orange-700 text-[11px] font-bold px-2.5 py-1 rounded-full border border-orange-200">
            <Ban className="w-3 h-3" /> Otro proyecto
          </span>
        </div>
      )}
      {!reserved && isBlockedByType && !isBlockedByOtherProject && (
        <div className="absolute top-3 right-3 z-10">
          <span className="flex items-center gap-1 bg-orange-100 text-orange-700 text-[11px] font-bold px-2.5 py-1 rounded-full border border-orange-200">
            <Ban className="w-3 h-3" /> No disponible
          </span>
        </div>
      )}
      {!reserved && !isBlocked && !meal.sold_out && !open && (
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
              ) : isBlockedByOtherProject ? (
                'Reservaste en otro proyecto'
              ) : isBlockedByType ? (
                'Ya tenés el otro turno'
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

type MealTab = 'almuerzo' | 'cena'

function MealTypeSwitch({
  active,
  onChange,
  almuerzoCount,
  cenaCount,
}: {
  active: MealTab
  onChange: (tab: MealTab) => void
  almuerzoCount: number
  cenaCount: number
}) {
  return (
    <div className="flex p-1 bg-muted rounded-2xl gap-1">
      <button
        type="button"
        onClick={() => onChange('almuerzo')}
        className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
          active === 'almuerzo'
            ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-200 shadow-sm border border-amber-200 dark:border-amber-800/50'
            : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        <Sun className="w-4 h-4" />
        Almuerzo
        {almuerzoCount > 0 && (
          <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full ${active === 'almuerzo' ? 'bg-amber-200 dark:bg-amber-800/60 text-amber-900 dark:text-amber-200' : 'bg-muted-foreground/20 text-muted-foreground'}`}>
            {almuerzoCount}
          </span>
        )}
      </button>
      <button
        type="button"
        onClick={() => onChange('cena')}
        className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
          active === 'cena'
            ? 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-200 shadow-sm border border-indigo-200 dark:border-indigo-800/50'
            : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        <Moon className="w-4 h-4" />
        Cena
        {cenaCount > 0 && (
          <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full ${active === 'cena' ? 'bg-indigo-200 dark:bg-indigo-800/60 text-indigo-900 dark:text-indigo-200' : 'bg-muted-foreground/20 text-muted-foreground'}`}>
            {cenaCount}
          </span>
        )}
      </button>
    </div>
  )
}

export default function ComidasPage() {
  const queryClient = useQueryClient()
  const { token, isRestoring } = useAuth()
  const { projectId = '' } = useParams<{ projectId: string }>()
  const defaultDate = useMemo(() => nextSaturdayYmd(), [])
  const [selectedDate, setSelectedDate] = useState(defaultDate)
  const [activeMealTab, setActiveMealTab] = useState<MealTab>('almuerzo')
  const [cancelBookingId, setCancelBookingId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const mealsQuery = useQuery({
    queryKey: ['meals', selectedDate, projectId],
    queryFn: () => listMealsByDate(token!, selectedDate, projectId || undefined),
    enabled: Boolean(token) && !isRestoring && Boolean(projectId),
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
      setActionError(mapBookingError(err))
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

  // Bookings del usuario para la fecha seleccionada (usando meal.date del objeto anidado)
  const bookingsOnSelectedDate = useMemo(
    () =>
      (bookingsQuery.data?.data ?? []).filter((b) =>
        b.meal?.date?.startsWith(selectedDate),
      ),
    [bookingsQuery.data?.data, selectedDate],
  )

  // ¿Tiene una reserva en OTRO proyecto para este día?
  const hasBookingInOtherProject = useMemo(
    () =>
      bookingsOnSelectedDate.some(
        (b) => b.meal?.project_id && b.meal.project_id !== projectId,
      ),
    [bookingsOnSelectedDate, projectId],
  )

  // Tipos de comida ya reservados en ESTE proyecto para este día
  const bookedTypesThisProject = useMemo(
    () =>
      new Set(
        bookingsOnSelectedDate
          .filter((b) => b.meal?.project_id === projectId)
          .map((b) => b.meal?.type)
          .filter(Boolean),
      ),
    [bookingsOnSelectedDate, projectId],
  )

  const sharedCardProps = {
    selectedDate,
    bookings: bookingsQuery.data?.data,
    onBook: (mealId: string) => bookMutation.mutate(mealId),
    onCancelRequest: setCancelBookingId,
    isBookPending: bookMutation.isPending,
    isCancelPending: cancelMutation.isPending,
    isBlockedByOtherProject: hasBookingInOtherProject,
  }

  return (
    <div className="min-h-screen">
      <PageHeader icon={UtensilsCrossed} title="Comidas" subtitle="Reservá tu lugar para el día elegido" />

      <div className="p-4 lg:p-6 max-w-3xl mx-auto space-y-5">

        {/* Back to projects */}
        <Link
          to="/app/comidas"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Volver a proyectos
        </Link>

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

        {/* Aviso: reserva en otro proyecto */}
        {hasBookingInOtherProject && (
          <div className="flex items-start gap-3 bg-orange-50 border border-orange-200 rounded-2xl px-4 py-3.5">
            <Ban className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-orange-800">Ya tenés una reserva en otro proyecto para este día</p>
              <p className="text-xs text-orange-600 mt-0.5">No podés asistir a dos proyectos el mismo día. Canelá la reserva anterior si querés cambiar de proyecto.</p>
            </div>
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

        {/* Almuerzo / Cena switch */}
        {!mealsQuery.isLoading && !mealsQuery.isError && sortedMeals.length > 0 && (
          <MealTypeSwitch
            active={activeMealTab}
            onChange={setActiveMealTab}
            almuerzoCount={almuerzoMeals.length}
            cenaCount={cenaMeals.length}
          />
        )}

        {/* Meals grid */}
        {!mealsQuery.isLoading && !mealsQuery.isError && sortedMeals.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2">
            {(activeMealTab === 'almuerzo' ? almuerzoMeals : cenaMeals).map((meal) => (
              <MealCard
                key={meal.id}
                meal={meal}
                {...sharedCardProps}
                isBlockedByType={!bookedTypesThisProject.has(meal.type) && bookedTypesThisProject.size > 0}
              />
            ))}
            {(activeMealTab === 'almuerzo' ? almuerzoMeals : cenaMeals).length === 0 && (
              <div className="sm:col-span-2 py-10 text-center text-sm text-muted-foreground">
                No hay opciones de {activeMealTab} para este día.
              </div>
            )}
          </div>
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
