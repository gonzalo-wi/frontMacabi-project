import { type ReactNode } from 'react'
import { type LucideIcon } from 'lucide-react'

import { useAuth } from '@/hooks/useAuth'
import { NotificationsBell } from '@/features/notifications/components/NotificationsBell'

interface PageHeaderProps {
  icon: LucideIcon
  title: ReactNode
  subtitle?: string
  action?: ReactNode
}

export function PageHeader({ icon: Icon, title, subtitle, action }: PageHeaderProps) {
  const { token } = useAuth()

  return (
    <>
      {/* Mobile header */}
      <header className="bg-card/75 text-foreground px-4 pt-6 pb-4 safe-area-top lg:hidden border-b border-border/40 backdrop-blur-md sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/10 text-primary shrink-0">
            <Icon className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-extrabold tracking-tight text-foreground">{title}</h1>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-0.5 leading-normal">{subtitle}</p>
            )}
          </div>
          {token && (
            <NotificationsBell
              token={token}
              className="p-2 rounded-full hover:bg-muted text-foreground shrink-0"
            />
          )}
        </div>
        {action && (
          <div className="mt-3.5 flex justify-start">
            {action}
          </div>
        )}
      </header>

      {/* Desktop topbar */}
      <div className="hidden lg:flex items-center justify-between gap-4 px-6 py-3.5 border-b border-border/40 bg-card/75 sticky top-0 z-20 backdrop-blur-md">
        <div className="flex min-w-0 items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/10 text-primary shrink-0">
            <Icon className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h1 className="text-sm font-extrabold tracking-tight text-foreground leading-none">{title}</h1>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-1 leading-normal">{subtitle}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {action && <div>{action}</div>}
          {token && (
            <NotificationsBell
              token={token}
              className="p-1.5 rounded-md hover:bg-muted text-foreground"
            />
          )}
        </div>
      </div>
    </>
  )
}
