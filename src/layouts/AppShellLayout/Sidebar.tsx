import { Link } from 'react-router-dom'
import { ChevronRight, KeyRound, LogOut, ShieldCheck } from 'lucide-react'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'

import { adminNavItems, participantNavItems } from './navItems'

type SidebarUser = { name: string; email: string }

export function Sidebar({
  pathname,
  isAdmin,
  user,
  userInitials,
  onOpenPw,
  onLogout,
}: {
  pathname: string
  isAdmin: boolean
  user: SidebarUser | null
  userInitials: string
  onOpenPw: () => void
  onLogout: () => void
}) {
  return (
    <aside
      className="hidden lg:flex flex-col fixed inset-y-0 left-0 w-64 z-50 overflow-hidden"
      style={{
        background: 'linear-gradient(160deg, oklch(0.14 0.045 258) 0%, oklch(0.11 0.035 255) 60%, oklch(0.10 0.03 252) 100%)',
        borderRight: '1px solid oklch(0.20 0.04 255)',
        boxShadow: '4px 0 24px -4px rgba(0,0,10,0.35)',
      }}
    >
      {/* Subtle noise / glow overlay */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 80% 40% at 50% -10%, oklch(0.55 0.14 225 / 0.10) 0%, transparent 70%)' }}
      />

      {/* Brand */}
      <div className="relative flex items-center gap-3 h-16 px-5 shrink-0">
        <div className="relative w-9 h-9 shrink-0">
          <div className="absolute inset-0 rounded-xl blur-sm opacity-60"
            style={{ background: 'linear-gradient(135deg, oklch(0.60 0.18 230), oklch(0.45 0.20 260))' }}
          />
          <div className="relative w-9 h-9 rounded-xl border border-white/20 flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, oklch(0.50 0.18 230 / 0.9), oklch(0.38 0.20 260 / 0.9))' }}
          >
            <img src="/logo_macabi.png" alt="Macabi" className="w-5 h-5 object-contain brightness-0 invert" />
          </div>
        </div>
        <div className="leading-none">
          <p className="font-bold text-sm tracking-wide text-white">Macabi</p>
          <p className="text-[11px] mt-0.5" style={{ color: 'oklch(0.65 0.06 230)' }}>Madrijim</p>
        </div>
      </div>

      <div className="relative mx-4"
        style={{ height: '1px', background: 'linear-gradient(90deg, transparent, oklch(0.30 0.06 255), transparent)' }}
      />

      {/* Nav items */}
      <nav className="relative flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'oklch(0.62 0.04 240)' }}>
          General
        </p>
        {participantNavItems.map((item) => {
          const isActive = item.isActive(pathname)
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                'group relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                isActive ? 'text-white' : 'text-white/55 hover:text-white/90',
              )}
              style={isActive ? {
                background: 'linear-gradient(90deg, oklch(0.55 0.14 225 / 0.22), oklch(0.55 0.14 225 / 0.08))',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)',
              } : {}}
            >
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-full"
                  style={{ background: 'linear-gradient(180deg, oklch(0.75 0.15 215), oklch(0.58 0.18 240))' }}
                />
              )}
              <span className={cn(
                'flex items-center justify-center w-7 h-7 rounded-md transition-all duration-200 shrink-0',
                isActive ? 'text-white' : 'text-white/55 group-hover:text-white/90',
              )}
                style={isActive ? {
                  background: 'oklch(0.55 0.14 225 / 0.30)',
                  boxShadow: '0 0 12px oklch(0.60 0.18 225 / 0.3)',
                } : {}}
              >
                <Icon className="w-4 h-4" />
              </span>
              <span className="flex-1">{item.label}</span>
              {isActive && <ChevronRight className="w-3.5 h-3.5 shrink-0 opacity-50" />}
              {!isActive && (
                <span className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                  style={{ background: 'rgba(255,255,255,0.04)' }}
                />
              )}
            </Link>
          )
        })}

        {isAdmin && (
          <>
            <div className="my-3 mx-1"
              style={{ height: '1px', background: 'linear-gradient(90deg, transparent, oklch(0.28 0.05 255), transparent)' }}
            />
            <div className="flex items-center gap-2 px-3 pb-2">
              <ShieldCheck className="w-3.5 h-3.5" style={{ color: 'oklch(0.75 0.15 80)' }} />
              <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'oklch(0.75 0.15 80)' }}>
                Administración
              </p>
            </div>
            {adminNavItems.map((item) => {
              const isActive = pathname.startsWith(item.href)
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  className={cn(
                    'group relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                    isActive ? 'text-white' : 'text-white/55 hover:text-white/90',
                  )}
                  style={isActive ? {
                    background: 'linear-gradient(90deg, oklch(0.70 0.15 80 / 0.18), oklch(0.70 0.15 80 / 0.06))',
                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
                  } : {}}
                >
                  {isActive && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-full"
                      style={{ background: 'linear-gradient(180deg, oklch(0.85 0.16 85), oklch(0.70 0.18 70))' }}
                    />
                  )}
                  <span className={cn(
                    'flex items-center justify-center w-7 h-7 rounded-md transition-all duration-200 shrink-0',
                    isActive ? '' : 'text-white/55 group-hover:text-white/90',
                  )}
                    style={isActive ? {
                      background: 'oklch(0.72 0.15 80 / 0.25)',
                      color: 'oklch(0.88 0.14 85)',
                      boxShadow: '0 0 12px oklch(0.72 0.15 80 / 0.25)',
                    } : {}}
                  >
                    <Icon className="w-4 h-4" />
                  </span>
                  <span className="flex-1">{item.label}</span>
                  {isActive && <ChevronRight className="w-3.5 h-3.5 shrink-0 opacity-50" />}
                  {!isActive && (
                    <span className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                      style={{ background: 'rgba(255,255,255,0.04)' }}
                    />
                  )}
                </Link>
              )
            })}
          </>
        )}
      </nav>

      {/* User footer */}
      {user && (
        <div className="relative shrink-0 p-3">
          <div className="mx-1 mb-3"
            style={{ height: '1px', background: 'linear-gradient(90deg, transparent, oklch(0.26 0.05 255), transparent)' }}
          />
          <div className="flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200"
            style={{
              background: 'oklch(0.18 0.04 255 / 0.7)',
              border: '1px solid oklch(0.28 0.05 255)',
              backdropFilter: 'blur(8px)',
            }}
          >
            <div className="relative shrink-0">
              <div className="absolute -inset-0.5 rounded-full opacity-80"
                style={{ background: 'linear-gradient(135deg, oklch(0.65 0.15 225), oklch(0.55 0.18 260))' }}
              />
              <Avatar className="relative h-8 w-8">
                <AvatarFallback className="font-bold text-xs text-white border-0"
                  style={{ background: 'linear-gradient(135deg, oklch(0.45 0.18 230), oklch(0.35 0.20 260))' }}
                >
                  {userInitials}
                </AvatarFallback>
              </Avatar>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate leading-none">{user.name}</p>
              <div className="flex items-center gap-1.5 mt-1">
                {isAdmin ? (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-semibold uppercase tracking-wide"
                    style={{
                      background: 'oklch(0.72 0.15 80 / 0.20)',
                      color: 'oklch(0.85 0.14 85)',
                      border: '1px solid oklch(0.72 0.15 80 / 0.30)',
                    }}
                  >
                    <ShieldCheck className="w-2.5 h-2.5" />
                    Admin
                  </span>
                ) : (
                  <span className="text-[10px]" style={{ color: 'oklch(0.55 0.04 240)' }}>
                    {user.email}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-0.5">
              <button
                onClick={onOpenPw}
                className="p-1.5 rounded-lg transition-all duration-150 cursor-pointer"
                style={{ color: 'oklch(0.55 0.04 240)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'white'; (e.currentTarget as HTMLButtonElement).style.background = 'oklch(0.95 0 0 / 0.08)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'oklch(0.55 0.04 240)'; (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
                title="Cambiar contraseña"
              >
                <KeyRound className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={onLogout}
                className="p-1.5 rounded-lg transition-all duration-150 cursor-pointer"
                style={{ color: 'oklch(0.55 0.04 240)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'oklch(0.65 0.18 25)'; (e.currentTarget as HTMLButtonElement).style.background = 'oklch(0.52 0.19 25 / 0.12)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'oklch(0.55 0.04 240)'; (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
                title="Cerrar sesión"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  )
}
