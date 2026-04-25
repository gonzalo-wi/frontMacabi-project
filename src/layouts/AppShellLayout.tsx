import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Bus,
  UtensilsCrossed,
  Receipt,
  Package,
  LogOut,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

const navItems = [
  { label: 'Panel', href: '/app', icon: LayoutDashboard },
  { label: 'Micros', href: '/app/micros', icon: Bus },
  { label: 'Comidas', href: '/app/comidas', icon: UtensilsCrossed },
  { label: 'Reembolsos', href: '/app/reembolsos', icon: Receipt },
  { label: 'Reservas', href: '/app/reservas', icon: Package },
]

export function AppShellLayout() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  const handleLogout = () => {
    logout()
    navigate('/', { replace: true })
  }

  return (
    <div className="min-h-screen bg-background">
      {/* ── Desktop sidebar ───────────────────────────────── */}
      <aside className="hidden lg:flex flex-col fixed inset-y-0 left-0 w-64 bg-sidebar z-50">
        {/* Brand */}
        <div className="flex items-center gap-3 h-16 px-5 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-sidebar-primary/15 border border-sidebar-primary/20 flex items-center justify-center shrink-0">
            <img
              src="/logo_macabi.png"
              alt="Macabi"
              className="w-5 h-5 object-contain brightness-0 invert"
            />
          </div>
          <div className="leading-none">
            <p className="font-bold text-sm text-sidebar-foreground">Macabi</p>
            <p className="text-[11px] text-sidebar-muted-foreground mt-0.5">Madrijim</p>
          </div>
        </div>

        <div className="h-px bg-sidebar-border mx-4" />

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== '/app' && pathname.startsWith(item.href))
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-foreground'
                    : 'text-sidebar-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-foreground',
                )}
              >
                <Icon
                  className={cn(
                    'w-4 h-4 shrink-0',
                    isActive ? 'text-sidebar-primary' : '',
                  )}
                />
                <span className="flex-1">{item.label}</span>
                {isActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-sidebar-primary shrink-0" />
                )}
              </Link>
            )
          })}
        </nav>

        {/* User footer */}
        {user && (
          <div className="shrink-0 px-3 py-4 border-t border-sidebar-border">
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-sidebar-accent/60">
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarFallback className="bg-sidebar-primary/20 text-sidebar-primary font-semibold text-xs border border-sidebar-primary/30">
                  {user.name.split(' ').map((n) => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-sidebar-foreground truncate leading-none">{user.name}</p>
                <p className="text-[11px] text-sidebar-muted-foreground truncate mt-0.5">{user.email}</p>
              </div>
              <button
                onClick={handleLogout}
                className="p-1.5 rounded-md text-sidebar-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
                title="Cerrar sesión"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </aside>

      {/* ── Main content area ─────────────────────────────── */}
      <main className="lg:pl-64 min-h-screen">
        <div className="pb-20 lg:pb-0">
          <Outlet />
        </div>
      </main>

      {/* ── Mobile bottom nav ─────────────────────────────── */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-md border-t border-border safe-area-bottom z-50">
        <div className="flex items-stretch justify-around h-16 max-w-lg mx-auto px-1">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== '/app' && pathname.startsWith(item.href))
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  'flex flex-col items-center justify-center flex-1 h-full gap-1 px-1 relative transition-colors',
                  isActive ? 'text-primary' : 'text-muted-foreground',
                )}
              >
                {isActive && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-b-full bg-primary" />
                )}
                <div className={cn(
                  'p-1 rounded-lg transition-colors',
                  isActive ? 'bg-primary/10' : '',
                )}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className={cn(
                  'text-[10px] leading-none',
                  isActive ? 'font-semibold' : 'font-medium',
                )}>
                  {item.label}
                </span>
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
