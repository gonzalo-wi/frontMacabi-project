import { Link } from 'react-router-dom'
import { Menu } from 'lucide-react'

import { cn } from '@/lib/utils'

import { mobileNavItems } from './navItems'

export function MobileNav({
  pathname,
  onOpenMore,
}: {
  pathname: string
  onOpenMore: () => void
}) {
  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 glass-navbar shadow-[0_-8px_24px_rgba(0,0,0,0.08)] safe-area-bottom">
      <nav className="flex items-center justify-around py-2 px-4">
        {mobileNavItems.map((item) => {
          const isActive = item.isActive(pathname)
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                'flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition-all duration-200 active:scale-90 select-none',
                isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <div className="relative p-1">
                <Icon className={cn('w-5 h-5 transition-transform duration-200', isActive && 'scale-110')} />
                {isActive && (
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-primary shadow-glow-blue" />
                )}
              </div>
              <span className="text-[10px] font-semibold tracking-wide">{item.label}</span>
            </Link>
          )
        })}
        <button
          onClick={onOpenMore}
          className="flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl text-muted-foreground hover:text-foreground transition-all duration-200 active:scale-90 select-none cursor-pointer"
        >
          <div className="p-1">
            <Menu className="w-5 h-5" />
          </div>
          <span className="text-[10px] font-semibold tracking-wide">Más</span>
        </button>
      </nav>
    </div>
  )
}
