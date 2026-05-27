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
      <header className="bg-card/75 text-foreground px-4 pt-6 pb-4 safe-area-top lg:hidden border-b border-border/40 backdrop-blur-md sticky top-0 z-20">
        <div className="flex items-center gap-3 pr-12">
          <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/10 text-primary shrink-0">
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-extrabold tracking-tight text-foreground">{title}</h1>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-0.5 leading-normal">{subtitle}</p>
            )}
          </div>
        </div>
        {action && (
          <div className="mt-3.5 flex justify-start">
            {action}
          </div>
        )}
      </header>

      {/* Desktop topbar */}
      <div className="hidden lg:flex items-center justify-between gap-4 px-6 py-3.5 border-b border-border/40 bg-card/75 sticky top-0 z-20 backdrop-blur-md pr-16">
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
        {action && <div className="flex shrink-0 justify-end">{action}</div>}
      </div>
    </>
  )
}
