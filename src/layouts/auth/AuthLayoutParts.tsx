import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

export function AuthDotGridBackground({ login = false }: { login?: boolean }) {
  return (
    <>
      <div
        className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle, white 1.5px, transparent 1.5px)',
          backgroundSize: login ? '30px 30px' : '28px 28px',
        }}
      />
      {login ? (
        <>
          <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-sidebar-primary/25 blur-3xl pointer-events-none" />
          <div className="absolute top-[38%] -left-20 w-60 h-60 rounded-full bg-blue-400/10 blur-3xl pointer-events-none hidden lg:block" />
          <div className="absolute -bottom-36 right-6 w-72 h-72 rounded-full bg-sidebar-primary/12 blur-3xl pointer-events-none hidden lg:block" />
        </>
      ) : (
        <>
          <div className="absolute -top-32 -right-32 w-80 h-80 rounded-full bg-sidebar-primary/8 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-32 -left-32 w-80 h-80 rounded-full bg-sidebar-primary/6 blur-3xl pointer-events-none" />
        </>
      )}
    </>
  )
}

export function AuthBrandMark({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const logoBox =
    size === 'sm'
      ? 'w-9 h-9'
      : size === 'lg'
        ? 'w-12 h-12 rounded-2xl'
        : 'w-10 h-10'
  const logoImg =
    size === 'sm' ? 'w-5 h-5' : size === 'lg' ? 'w-7 h-7' : 'w-6 h-6'
  const titleClass =
    size === 'sm'
      ? 'font-bold text-sidebar-foreground text-sm lg:text-base tracking-wide'
      : size === 'lg'
        ? 'font-bold text-lg tracking-tight'
        : 'font-bold text-sidebar-foreground text-base'
  const subtitleClass =
    size === 'sm'
      ? 'text-sidebar-muted-foreground text-[10px] uppercase font-bold tracking-widest mt-0.5'
      : size === 'lg'
        ? 'text-xs text-muted-foreground'
        : 'text-sidebar-muted-foreground text-xs mt-0.5'

  return (
    <div className="flex items-center gap-3">
      <div
        className={`${logoBox} rounded-xl bg-white/10 border border-white/15 flex items-center justify-center shrink-0 ${size === 'sm' ? 'shadow-lg' : ''}`}
      >
        <img
          src="/logo_macabi.png"
          alt="Macabi"
          className={`${logoImg} object-contain brightness-0 invert`}
        />
      </div>
      <div className="leading-none">
        <p className={titleClass}>Macabi</p>
        <p className={subtitleClass}>Organización Hebrea Argentina</p>
      </div>
    </div>
  )
}

export function AuthHeroPanel({
  heroVisual,
  heroTitle,
  heroSubtitle,
}: {
  heroVisual: ReactNode
  heroTitle: ReactNode
  heroSubtitle: string
}) {
  return (
    <div className="hidden lg:flex lg:w-[46%] xl:w-[50%] bg-sidebar flex-col justify-between p-10 relative overflow-hidden">
      <AuthDotGridBackground />

      <div className="relative z-10">
        <AuthBrandMark />
      </div>

      <div className="relative z-10 space-y-6">
        <div className="w-24 h-24 rounded-3xl bg-white/10 border border-white/12 flex items-center justify-center shadow-2xl">
          {heroVisual}
        </div>
        <div>
          <h1 className="text-4xl font-extrabold text-sidebar-foreground leading-[1.15] tracking-tight">
            {heroTitle}
          </h1>
          <p className="mt-4 text-sm text-sidebar-muted-foreground leading-relaxed max-w-xs">
            {heroSubtitle}
          </p>
        </div>
      </div>

      <div className="relative z-10">
        <p className="text-xs text-sidebar-muted-foreground/60">
          © {new Date().getFullYear()} Macabi Argentina · Plataforma Madrijim
        </p>
      </div>
    </div>
  )
}

export function AuthFormColumn({
  backLink,
  icon,
  title,
  subtitle,
  children,
}: {
  backLink?: { to: string; label: string }
  icon: ReactNode
  title: string
  subtitle: string
  children: ReactNode
}) {
  return (
    <div className="flex-1 flex flex-col bg-background">
      <div className="lg:hidden flex items-center gap-3 px-6 pt-12 pb-6">
        <div className="w-12 h-12 rounded-2xl bg-sidebar flex items-center justify-center shadow-lg shrink-0">
          <img
            src="/logo_macabi.png"
            alt="Macabi"
            className="w-7 h-7 object-contain brightness-0 invert"
          />
        </div>
        <div>
          <p className="font-bold text-lg tracking-tight">Macabi</p>
          <p className="text-xs text-muted-foreground">Organización Hebrea Argentina</p>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-6 lg:px-16 py-8">
        <div className="w-full max-w-sm">
          {backLink && (
            <Link
              to={backLink.to}
              className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors mb-10"
            >
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              {backLink.label}
            </Link>
          )}

          <div className="w-11 h-11 mb-6 rounded-xl bg-primary/10 border border-primary/15 flex items-center justify-center">
            {icon}
          </div>

          <h2 className="text-2xl font-bold tracking-tight mb-1.5">{title}</h2>
          <p className="text-muted-foreground text-sm mb-8 leading-relaxed">{subtitle}</p>

          {children}
        </div>
      </div>

      <div className="hidden lg:block px-16 pb-8">
        <p className="text-xs text-muted-foreground/60">© {new Date().getFullYear()} Macabi Argentina</p>
      </div>
    </div>
  )
}

export function AuthSuccessLayout({
  icon,
  title,
  message,
  action,
  footer,
}: {
  icon: ReactNode
  title: string
  message: ReactNode
  action: ReactNode
  footer?: ReactNode
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background">
      <div className="w-full max-w-sm text-center">
        <div className="flex items-center justify-center gap-2 mb-10">
          <div className="w-9 h-9 rounded-xl bg-sidebar flex items-center justify-center">
            <img src="/logo_macabi.png" alt="" className="w-5 h-5 object-contain brightness-0 invert" />
          </div>
          <span className="font-bold text-base">Macabi</span>
        </div>
        {icon}
        <h2 className="text-2xl font-bold tracking-tight mb-2">{title}</h2>
        <p className="text-muted-foreground text-sm mb-8 leading-relaxed">{message}</p>
        {action}
        {footer}
      </div>
    </div>
  )
}
