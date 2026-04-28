import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  UtensilsCrossed,
  LogOut,
  User,
  CheckCircle2,
  Moon,
  Sun,
} from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { listMealsByDate } from '@/lib/api/meals'
import { listMyBookings } from '@/lib/api/bookings'
import type { BookingDTO, MealDTO } from '@/lib/api/types'
import {
  isMealBookingOpen,
  mealDateYmd,
  nextSaturdayYmd,
  formatEventDateAR,
} from '@/lib/meal-utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const CATEGORY_META: Record<string, { label: string; color: string }> = {
  pastas:             { label: 'Pastas',       color: 'bg-amber-400' },
  milanesas:          { label: 'Milanesas',    color: 'bg-rose-400' },
  ensaladas:          { label: 'Ensaladas',    color: 'bg-emerald-400' },
  sandwiches_y_wraps: { label: 'Sandwiches',   color: 'bg-sky-400' },
  pollo:              { label: 'Pollo',        color: 'bg-orange-400' },
  carne:              { label: 'Carne',        color: 'bg-violet-400' },
}

function MealServiceCard({
  type,
  mealDayYmd,
  booking,
  meals,
  hasBookable,
  isLoading,
}: {
  type: 'almuerzo' | 'cena'
  mealDayYmd: string
  booking: BookingDTO | undefined
  meals: MealDTO[]
  hasBookable: boolean
  isLoading: boolean
}) {
  const label = type === 'almuerzo' ? 'Almuerzo' : 'Cena'
  const ServiceIcon = type === 'almuerzo' ? Sun : Moon
  return (
    <Link to="/app/comidas">
      <Card className="overflow-hidden hover:shadow-lg transition-all duration-200 cursor-pointer group">
        <div className={`relative px-5 pt-5 pb-4 ${
          booking
            ? 'bg-gradient-to-br from-emerald-600 to-emerald-500'
            : hasBookable
              ? 'bg-gradient-to-br from-[#0D1B2A] to-[#1a3a5c]'
              : 'bg-gradient-to-br from-muted to-muted/60'
        }`}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className={`text-[11px] font-semibold uppercase tracking-wider mb-1 ${
                booking ? 'text-emerald-100' : hasBookable ? 'text-blue-300' : 'text-muted-foreground'
              }`}>
                {label} · {formatEventDateAR(mealDayYmd)}
              </p>
              {isLoading ? (
                <div className="h-6 w-32 bg-white/20 rounded animate-pulse" />
              ) : booking?.meal ? (
                <p className="text-white font-bold text-lg leading-snug truncate">{booking.meal.title}</p>
              ) : hasBookable ? (
                <p className="text-white font-bold text-lg">Sin confirmar</p>
              ) : (
                <p className="text-muted-foreground font-semibold text-base">
                  {meals.length === 0 ? 'Sin menú publicado' : 'Sin cupo disponible'}
                </p>
              )}
            </div>
            <div className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${
              booking ? 'bg-white/20' : hasBookable ? 'bg-white/10' : 'bg-muted'
            }`}>
              {booking
                ? <CheckCircle2 className="w-5 h-5 text-white" />
                : <ServiceIcon className={`w-5 h-5 ${hasBookable ? 'text-blue-300' : 'text-muted-foreground'}`} />}
            </div>
          </div>
        </div>
        <CardContent className="px-5 py-3 flex items-center justify-between">
          <p className={`text-xs font-medium ${
            booking ? 'text-emerald-600 dark:text-emerald-400' : hasBookable ? 'text-primary' : 'text-muted-foreground'
          }`}>
            {booking ? '✓ Reserva confirmada' : hasBookable ? 'Reservar ahora →' : 'Ver menú →'}
          </p>
          {booking?.meal?.category && (
            <span className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
              {CATEGORY_META[booking.meal.category]?.label ?? booking.meal.category}
            </span>
          )}
        </CardContent>
      </Card>
    </Link>
  )
}

export default function PanelPage() {
  const navigate = useNavigate()
  const { user, logout, token, isRestoring } = useAuth()
  const mealDayYmd = useMemo(() => nextSaturdayYmd(), [])

  const mealsForDay = useQuery({
    queryKey: ['meals', mealDayYmd],
    queryFn: () => listMealsByDate(token!, mealDayYmd),
    enabled: Boolean(token) && !isRestoring,
  })

  const myBookings = useQuery({
    queryKey: ['my-bookings'],
    queryFn: () => listMyBookings(token!),
    enabled: Boolean(token) && !isRestoring,
  })

  const lunchBookingToday = myBookings.data?.data.find(
    (b) =>
      b.meal?.type === 'almuerzo' &&
      b.meal &&
      mealDateYmd(b.meal.date) === mealDayYmd,
  )

  const cenaBookingToday = myBookings.data?.data.find(
    (b) =>
      b.meal?.type === 'cena' &&
      b.meal &&
      mealDateYmd(b.meal.date) === mealDayYmd,
  )

  const lunchMealsToday =
    mealsForDay.data?.data.filter((m) => m.type === 'almuerzo' && mealDateYmd(m.date) === mealDayYmd) ?? []

  const cenaMealsToday =
    mealsForDay.data?.data.filter((m) => m.type === 'cena' && mealDateYmd(m.date) === mealDayYmd) ?? []

  const hasBookableLunch = lunchMealsToday.some((m) => !m.sold_out && isMealBookingOpen(m.date))
  const hasBookableCena = cenaMealsToday.some((m) => !m.sold_out && isMealBookingOpen(m.date))

  const lunchStatLabel =
    mealsForDay.isLoading || myBookings.isLoading
      ? '…'
      : lunchBookingToday
        ? 'Confirmado'
        : hasBookableLunch
          ? 'Sin confirmar'
          : lunchMealsToday.length === 0
            ? 'Sin menú'
            : 'Sin cupo'

  const showMealPending = Boolean(!lunchBookingToday && hasBookableLunch)

  const satBookings = useMemo(
    () => myBookings.data?.data.filter((b) => b.meal && mealDateYmd(b.meal.date) === mealDayYmd) ?? [],
    [myBookings.data?.data, mealDayYmd],
  )

  const nextSatBooking = satBookings[0]

  const categoryBreakdown = useMemo(() => {
    const meals = myBookings.data?.data.flatMap((b) => (b.meal ? [b.meal] : [])) ?? []
    const counts: Record<string, number> = {}
    for (const meal of meals) {
      counts[meal.category] = (counts[meal.category] ?? 0) + 1
    }
    const max = Math.max(...Object.values(counts), 1)
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([cat, count]) => ({
        cat,
        count,
        pct: Math.round((count / max) * 100),
        meta: CATEGORY_META[cat] ?? { label: cat, color: 'bg-muted-foreground' },
      }))
  }, [myBookings.data?.data])

  const totalMealsBooked = myBookings.data?.data.filter((b) => b.meal).length ?? 0

  const handleLogout = () => {
    logout()
    navigate('/', { replace: true })
  }

  if (!user) return null

  return (
    <div className="min-h-screen">
      {/* ── Mobile header ── */}
      <header className="bg-sidebar text-sidebar-foreground px-4 pt-6 pb-4 safe-area-top lg:hidden">
        <div className="flex items-center gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="focus:outline-none">
                <Avatar className="h-9 w-9 border border-sidebar-border">
                  <AvatarFallback className="bg-sidebar-accent text-sidebar-primary font-semibold text-xs">
                    {user.name.split(' ').map((n) => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuLabel>Mi cuenta</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <User className="mr-2 h-4 w-4" />
                {user.name}
              </DropdownMenuItem>
              <DropdownMenuItem className="text-muted-foreground text-xs">
                {user.email}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                Cerrar sesión
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <div>
            <p className="text-xs text-sidebar-muted-foreground">¡Hola,</p>
            <h1 className="text-base font-bold text-sidebar-foreground leading-none">
              {user.name.split(' ')[0]}!
            </h1>
          </div>
        </div>
      </header>

      {/* ── Desktop top bar ── */}
      <div className="hidden lg:flex items-center h-16 px-6 border-b border-border bg-card/80 sticky top-0 z-10 backdrop-blur-md">
        <div>
          <h2 className="text-sm font-semibold leading-none">
            ¡Hola, {user.name.split(' ')[0]}!
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">Aquí está tu resumen</p>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="p-4 lg:p-6 max-w-6xl mx-auto">
        <div className="lg:grid lg:grid-cols-3 lg:gap-6 lg:items-start space-y-4 lg:space-y-0">

          {/* Main column */}
          <div className="lg:col-span-2 space-y-4">

            {/* Almuerzo sábado */}
            <MealServiceCard
              type="almuerzo"
              mealDayYmd={mealDayYmd}
              booking={lunchBookingToday}
              meals={lunchMealsToday}
              hasBookable={hasBookableLunch}
              isLoading={mealsForDay.isLoading || myBookings.isLoading}
            />

            {/* Cena sábado — solo si hay menú o reserva */}
            {(cenaBookingToday || cenaMealsToday.length > 0) && (
              <MealServiceCard
                type="cena"
                mealDayYmd={mealDayYmd}
                booking={cenaBookingToday}
                meals={cenaMealsToday}
                hasBookable={hasBookableCena}
                isLoading={mealsForDay.isLoading || myBookings.isLoading}
              />
            )}
          </div>

          {/* Sidebar column */}
          <div className="space-y-4">



            {/* Mis comidas */}
            <Card className="shadow-sm">
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <UtensilsCrossed className="w-4 h-4 text-accent" />
                  Mis comidas
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-4">
                {/* Reserva próximo sábado */}
                {myBookings.isLoading ? (
                  <div className="h-14 bg-muted/50 rounded-lg animate-pulse" />
                ) : nextSatBooking?.meal ? (
                  <div className="flex items-center gap-3 p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-lg">
                    <div className="p-1.5 rounded-md bg-emerald-100 dark:bg-emerald-900 shrink-0">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium uppercase tracking-wide">Reservado · sábado</p>
                      <p className="text-sm font-semibold truncate">{nextSatBooking.meal.title}</p>
                    </div>
                  </div>
                ) : (
                  <Link to="/app/comidas">
                    <div className="flex items-center gap-3 p-3 bg-muted/40 border border-border/50 rounded-lg hover:bg-muted/70 transition-colors">
                      <div className="p-1.5 rounded-md bg-muted shrink-0">
                        <UtensilsCrossed className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Sin reserva para el sábado</p>
                        <p className="text-sm font-medium text-primary">Ver menú →</p>
                      </div>
                    </div>
                  </Link>
                )}

                {/* Historial por categoría */}
                {categoryBreakdown.length > 0 && (
                  <div className="space-y-2.5">
                    <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wide">
                      Historial · {totalMealsBooked} {totalMealsBooked === 1 ? 'reserva' : 'reservas'}
                    </p>
                    {categoryBreakdown.map(({ cat, count, pct, meta }) => (
                      <div key={cat}>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-muted-foreground">{meta.label}</span>
                          <span className="font-semibold tabular-nums">{count}</span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${meta.color}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
