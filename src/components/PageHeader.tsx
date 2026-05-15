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
        <div className="flex items-center gap-3 pr-12">
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
        {action && (
          <div className="mt-3 ml-1 [&_button]:border-white/30 [&_button]:text-white [&_button]:bg-transparent [&_button]:hover:bg-white/10 [&_a]:border-white/30 [&_a]:text-white [&_a]:bg-transparent [&_a]:hover:bg-white/10">
            {action}
          </div>
        )}
      </header>

      {/* Desktop topbar */}
      <div className="hidden lg:block px-6 py-3 border-b border-border bg-card/80 sticky top-0 z-10 backdrop-blur-md pr-16">
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
        {action && <div className="mt-2 ml-10">{action}</div>}
      </div>
    </>
  )
}
