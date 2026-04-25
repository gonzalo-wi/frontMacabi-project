import { Link, Outlet, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Bus,
  UtensilsCrossed,
  Receipt,
  Package,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { label: 'Panel', href: '/app', icon: LayoutDashboard },
  { label: 'Micros', href: '/app/micros', icon: Bus },
  { label: 'Comidas', href: '/app/comidas', icon: UtensilsCrossed },
  { label: 'Reembolsos', href: '/app/reembolsos', icon: Receipt },
  { label: 'Reservas', href: '/app/reservas', icon: Package },
]

export function AppShellLayout() {
  const { pathname } = useLocation()

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <main className="flex-1 pb-20 overflow-auto">
        <Outlet />
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border safe-area-bottom z-50">
        <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
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
                  'flex flex-col items-center justify-center flex-1 h-full px-1 transition-colors',
                  isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <Icon
                  className={cn(
                    'w-5 h-5 mb-1 transition-transform',
                    isActive && 'scale-110',
                  )}
                />
                <span
                  className={cn(
                    'text-[10px] font-medium',
                    isActive && 'font-semibold',
                  )}
                >
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
