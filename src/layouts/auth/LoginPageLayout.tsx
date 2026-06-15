import type { ReactNode } from 'react'

import { LoginBrandingPanel } from '@/layouts/auth/LoginBrandingPanel'

type Props = {
  children: ReactNode
}

export function LoginPageLayout({ children }: Props) {
  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      <LoginBrandingPanel />

      <div className="flex-1 flex flex-col bg-background rounded-t-3xl lg:rounded-none -mt-6 lg:mt-0 relative z-10 shadow-[0_-10px_40px_rgba(0,0,0,0.10)] lg:shadow-none border-t border-border/30 lg:border-t-0 lg:bg-muted/25">
        <div className="lg:hidden flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/15" />
        </div>

        <div className="flex-1 flex items-start lg:items-center justify-center px-6 lg:px-12 xl:px-16 pt-8 pb-10 lg:py-8">
          <div className="w-full max-w-sm">
            <div className="lg:bg-card lg:border lg:border-border/60 lg:shadow-[0_8px_40px_rgba(0,0,0,0.07)] lg:rounded-2xl lg:p-8 space-y-6">
              {children}
            </div>
          </div>
        </div>

        <div className="hidden lg:block px-12 xl:px-16 pb-8">
          <p className="text-[11px] text-muted-foreground/40">
            © {new Date().getFullYear()} Macabi Argentina · Todos los derechos reservados
          </p>
        </div>
      </div>
    </div>
  )
}
