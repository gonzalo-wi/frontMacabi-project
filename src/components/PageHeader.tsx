import { type ReactNode } from 'react'
import { type LucideIcon } from 'lucide-react'

interface PageHeaderProps {
  icon: LucideIcon
  title: ReactNode
  subtitle?: string
  action?: ReactNode
}

export function PageHeader({ icon: Icon, title, subtitle, action }: PageHeaderProps) {
  return (
    <>
      {/* Mobile header */}
      <header className="bg-sidebar text-sidebar-foreground px-4 pt-6 pb-4 safe-area-top lg:hidden">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-white/10 border border-white/10 shrink-0">
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">{title}</h1>
              {subtitle && (
                <p className="text-sm text-sidebar-muted-foreground mt-0.5">{subtitle}</p>
              )}
            </div>
          </div>
          {action && <div className="shrink-0 ml-4">{action}</div>}
        </div>
      </header>

      {/* Desktop topbar */}
      <div className="hidden lg:flex items-center justify-between h-16 px-6 border-b border-border bg-card/80 sticky top-0 z-10 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10 shrink-0">
            <Icon className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h1 className="text-sm font-semibold leading-none">{title}</h1>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
            )}
          </div>
        </div>
        {action && <div>{action}</div>}
      </div>
    </>
  )
}
