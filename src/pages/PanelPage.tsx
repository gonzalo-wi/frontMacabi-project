import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import {
  Bell,
  Bus,
  UtensilsCrossed,
  Receipt,
  Package,
  ChevronRight,
  Clock,
  LogOut,
  User,
} from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { notifications, micros, expenses, userReservations, getTimeRemaining } from '@/lib/mock-data'
import { listMealsByDate } from '@/lib/api/meals'
import { listMyBookings } from '@/lib/api/bookings'
import {
  bookingDeadlineIsoForMealYmd,
  isMealBookingOpen,
  mealDateYmd,
  todayMealYmd,
} from '@/lib/meal-utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export default function PanelPage() {
  const navigate = useNavigate()
  const { user, logout, token, isRestoring } = useAuth()
  const mealDayYmd = useMemo(() => todayMealYmd(), [])

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

  const lunchMealsToday =
    mealsForDay.data?.data.filter((m) => m.type === 'almuerzo' && mealDateYmd(m.date) === mealDayYmd) ?? []

  const hasBookableLunch = lunchMealsToday.some((m) => !m.sold_out && isMealBookingOpen(m.date))
  const lunchDeadlineIso = bookingDeadlineIsoForMealYmd(mealDayYmd)

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
  const [notifs, setNotifs] = useState(notifications)
  const unreadCount = notifs.filter((n) => !n.read).length

  const availableMicro = micros.find((m) => !m.userReserved)
  const pendingExpenses = expenses.filter((e) => e.status === 'pending').length
  const activeReservations = userReservations.filter((r) => !r.returned).length

  const handleLogout = () => {
    logout()
    navigate('/', { replace: true })
  }

  const markAsRead = (id: string) => {
    setNotifs((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
  }

  if (!user) return null

  const statsCards = [
    {
      href: '/app/micros',
      icon: Bus,
      label: 'Próximo micro',
      value: availableMicro ? `${45 - availableMicro.reservedSeats} lugares` : 'Reservado',
      colorClass: 'bg-primary/10 text-primary',
    },
    {
      href: '/app/comidas',
      icon: UtensilsCrossed,
      label: 'Almuerzo hoy',
      value: lunchStatLabel,
      colorClass: 'bg-accent/15 text-accent',
    },
    {
      href: '/app/reembolsos',
      icon: Receipt,
      label: 'Gastos pendientes',
      value: String(pendingExpenses),
      colorClass: 'bg-warning/20 text-warning-foreground',
    },
    {
      href: '/app/reservas',
      icon: Package,
      label: 'Reservas activas',
      value: String(activeReservations),
      colorClass: 'bg-success/15 text-success',
    },
  ]

  return (
    <div className="min-h-screen">
      {/* ── Mobile header ── */}
      <header className="bg-sidebar text-sidebar-foreground px-4 pt-6 pb-4 safe-area-top lg:hidden">
        <div className="flex items-center justify-between">
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

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="relative p-2 rounded-lg hover:bg-sidebar-accent transition-colors">
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-destructive rounded-full text-[9px] font-bold flex items-center justify-center text-white">
                    {unreadCount}
                  </span>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <DropdownMenuLabel className="flex items-center justify-between">
                Notificaciones
                {unreadCount > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {unreadCount} nuevas
                  </Badge>
                )}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {notifs.slice(0, 5).map((notif) => (
                <DropdownMenuItem
                  key={notif.id}
                  className="flex flex-col items-start gap-1 py-3"
                  onClick={() => markAsRead(notif.id)}
                >
                  <div className="flex items-center gap-2 w-full">
                    {!notif.read && (
                      <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                    )}
                    <span className={`font-medium text-sm ${notif.read ? 'pl-3.5' : ''}`}>
                      {notif.title}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2 pl-3.5">
                    {notif.message}
                  </p>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* ── Desktop top bar ── */}
      <div className="hidden lg:flex items-center justify-between h-16 px-6 border-b border-border bg-card/80 sticky top-0 z-10 backdrop-blur-md">
        <div>
          <h2 className="text-sm font-semibold leading-none">
            ¡Hola, {user.name.split(' ')[0]}!
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">Aquí está tu resumen de hoy</p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="relative p-2 rounded-lg hover:bg-muted transition-colors">
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-destructive rounded-full text-[9px] font-bold flex items-center justify-center text-destructive-foreground">
                  {unreadCount}
                </span>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel className="flex items-center justify-between">
              Notificaciones
              {unreadCount > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {unreadCount} nuevas
                </Badge>
              )}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {notifs.slice(0, 5).map((notif) => (
              <DropdownMenuItem
                key={notif.id}
                className="flex flex-col items-start gap-1 py-3"
                onClick={() => markAsRead(notif.id)}
              >
                <div className="flex items-center gap-2 w-full">
                  {!notif.read && (
                    <div className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                  )}
                  <span className={`font-medium text-sm ${notif.read ? 'pl-3.5' : ''}`}>
                    {notif.title}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2 pl-3.5">
                  {notif.message}
                </p>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* ── Content ── */}
      <div className="p-4 lg:p-6 max-w-6xl mx-auto">
        <div className="lg:grid lg:grid-cols-3 lg:gap-6 lg:items-start space-y-4 lg:space-y-0">

          {/* Main column */}
          <div className="lg:col-span-2 space-y-4">

            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-3">
              {statsCards.map(({ href, icon: Icon, label, value, colorClass }) => (
                <Link key={href} to={href}>
                  <Card className="hover:shadow-md transition-all duration-200 cursor-pointer group">
                    <CardContent className="p-4">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${colorClass}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
                      <p className="font-bold text-base leading-tight group-hover:text-primary transition-colors">
                        {value}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>

            {/* Pending actions */}
            {(availableMicro || showMealPending) && (
              <Card className="border-primary/20 bg-primary/5 shadow-sm">
                <CardHeader className="pb-2 pt-4 px-4">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <div className="w-5 h-5 rounded-md bg-primary/15 flex items-center justify-center">
                      <Clock className="w-3 h-3 text-primary" />
                    </div>
                    Acciones pendientes
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 px-4 pb-4">
                  {availableMicro && !micros.some((m) => m.userReserved) && (
                    <Link to="/app/micros">
                      <div className="flex items-center justify-between p-3 bg-card rounded-lg hover:bg-muted/50 transition-colors border border-border/50">
                        <div className="flex items-center gap-3">
                          <div className="p-1.5 rounded-md bg-primary/10">
                            <Bus className="w-4 h-4 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">Reservar lugar en micro</p>
                            <p className="text-xs text-muted-foreground">
                              {getTimeRemaining(availableMicro.reservationDeadline)}
                            </p>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      </div>
                    </Link>
                  )}

                  {showMealPending && (
                    <Link to="/app/comidas">
                      <div className="flex items-center justify-between p-3 bg-card rounded-lg hover:bg-muted/50 transition-colors border border-border/50">
                        <div className="flex items-center gap-3">
                          <div className="p-1.5 rounded-md bg-accent/15">
                            <UtensilsCrossed className="w-4 h-4 text-accent" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">Reservar almuerzo</p>
                            <p className="text-xs text-muted-foreground">
                              {getTimeRemaining(lunchDeadlineIso)}
                            </p>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      </div>
                    </Link>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar column */}
          <div className="space-y-4">

            {/* Upcoming Events */}
            <Card className="shadow-sm">
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm font-semibold">Próximos eventos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 px-4 pb-4">
                {[
                  { day: '25', month: 'Abr', title: 'Jornada en el campo', place: 'Campo Macabi · Ezeiza' },
                  { day: '02', month: 'May', title: 'Reunión de madrijim', place: 'Sede central' },
                ].map((evt) => (
                  <div key={evt.day + evt.month} className="flex items-center gap-3 p-3 bg-muted/40 rounded-lg">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex flex-col items-center justify-center shrink-0">
                      <p className="text-sm font-bold text-primary leading-none">{evt.day}</p>
                      <p className="text-[9px] text-primary/70 uppercase font-medium mt-0.5">{evt.month}</p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{evt.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{evt.place}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card className="shadow-sm">
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm font-semibold">Actividad reciente</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <div className="space-y-3">
                  {notifs.slice(0, 3).map((notif) => (
                    <div key={notif.id} className="flex items-start gap-3">
                      <div
                        className={`p-1.5 rounded-lg shrink-0 ${
                          notif.type === 'micro'
                            ? 'bg-primary/10'
                            : notif.type === 'meal'
                              ? 'bg-accent/15'
                              : notif.type === 'expense'
                                ? 'bg-success/15'
                                : 'bg-muted'
                        }`}
                      >
                        {notif.type === 'micro' && <Bus className="w-3 h-3 text-primary" />}
                        {notif.type === 'meal' && <UtensilsCrossed className="w-3 h-3 text-accent" />}
                        {notif.type === 'expense' && <Receipt className="w-3 h-3 text-success" />}
                        {notif.type === 'reservation' && <Package className="w-3 h-3 text-muted-foreground" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{notif.title}</p>
                        <p className="text-xs text-muted-foreground line-clamp-1">{notif.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
