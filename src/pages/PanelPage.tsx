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
  User
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
  const unreadCount = notifs.filter(n => !n.read).length
  
  const availableMicro = micros.find(m => !m.userReserved)
  const pendingExpenses = expenses.filter(e => e.status === 'pending').length
  const activeReservations = userReservations.filter(r => !r.returned).length

  const handleLogout = () => {
    logout()
    navigate('/', { replace: true })
  }

  const markAsRead = (id: string) => {
    setNotifs(prev => prev.map(n => 
      n.id === id ? { ...n, read: true } : n
    ))
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-primary text-primary-foreground p-4 pt-6 safe-area-top">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="focus:outline-none">
                  <Avatar className="h-10 w-10 border-2 border-primary-foreground/20">
                    <AvatarFallback className="bg-primary-foreground/20 text-primary-foreground font-medium">
                      {user.name
                        .split(' ')
                        .map((n) => n[0])
                        .join('')}
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
              <p className="text-sm opacity-80">¡Hola,</p>
              <h1 className="text-lg font-semibold">{user.name.split(' ')[0]}!</h1>
            </div>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="relative p-2 rounded-full hover:bg-primary-foreground/10 transition-colors">
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-destructive rounded-full text-[10px] font-bold flex items-center justify-center">
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
                      <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                    )}
                    <span className="font-medium text-sm">{notif.title}</span>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2 pl-4">
                    {notif.message}
                  </p>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-3">
          <Link to="/app/micros">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Bus className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Próximo micro</p>
                    <p className="font-semibold text-sm">
                      {availableMicro ? `${45 - availableMicro.reservedSeats} lugares` : 'Reservado'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link to="/app/comidas">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-accent/20">
                    <UtensilsCrossed className="w-5 h-5 text-accent" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Almuerzo</p>
                    <p className="font-semibold text-sm">{lunchStatLabel}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link to="/app/reembolsos">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-warning/20">
                    <Receipt className="w-5 h-5 text-warning-foreground" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Gastos pendientes</p>
                    <p className="font-semibold text-sm">{pendingExpenses}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link to="/app/reservas">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-success/20">
                    <Package className="w-5 h-5 text-success" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Reservas activas</p>
                    <p className="font-semibold text-sm">{activeReservations}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Urgent Actions */}
        {(availableMicro || showMealPending) && (
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                Acciones pendientes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {availableMicro && !micros.some(m => m.userReserved) && (
                <Link to="/app/micros">
                  <div className="flex items-center justify-between p-3 bg-card rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <Bus className="w-5 h-5 text-primary" />
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
                  <div className="flex items-center justify-between p-3 bg-card rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <UtensilsCrossed className="w-5 h-5 text-accent" />
                      <div>
                        <p className="font-medium text-sm">Reservar almuerzo</p>
                        <p className="text-xs text-muted-foreground">{getTimeRemaining(lunchDeadlineIso)}</p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                </Link>
              )}
            </CardContent>
          </Card>
        )}

        {/* Upcoming Events */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Próximos eventos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
              <div className="text-center min-w-[44px]">
                <p className="text-lg font-bold text-primary">25</p>
                <p className="text-[10px] text-muted-foreground uppercase">Abril</p>
              </div>
              <div className="flex-1">
                <p className="font-medium text-sm">Jornada en el campo</p>
                <p className="text-xs text-muted-foreground">Campo Macabi - Ezeiza</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
              <div className="text-center min-w-[44px]">
                <p className="text-lg font-bold text-primary">02</p>
                <p className="text-[10px] text-muted-foreground uppercase">Mayo</p>
              </div>
              <div className="flex-1">
                <p className="font-medium text-sm">Reunión de madrijim</p>
                <p className="text-xs text-muted-foreground">Sede central</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Actividad reciente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {notifs.slice(0, 3).map((notif) => (
                <div key={notif.id} className="flex items-start gap-3">
                  <div className={`p-1.5 rounded-full ${
                    notif.type === 'micro' ? 'bg-primary/10' :
                    notif.type === 'meal' ? 'bg-accent/20' :
                    notif.type === 'expense' ? 'bg-success/20' :
                    'bg-muted'
                  }`}>
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
  )
}
