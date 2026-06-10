import { Link } from 'react-router-dom'
import { ChevronRight, KeyRound, LogOut, ShieldCheck } from 'lucide-react'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Drawer, DrawerClose, DrawerContent } from '@/components/ui/drawer'
import { cn } from '@/lib/utils'

import { adminNavItems, participantNavItems } from './navItems'

type DrawerUser = { name: string; email: string }

export function MobileDrawer({
  open,
  onOpenChange,
  pathname,
  isAdmin,
  user,
  userInitials,
  onOpenPw,
  onLogout,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  pathname: string
  isAdmin: boolean
  user: DrawerUser | null
  userInitials: string
  onOpenPw: () => void
  onLogout: () => void
}) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction="left">
      <DrawerContent
        className="w-[85vw] max-w-[320px] h-full flex flex-col rounded-none border-r p-0 overflow-hidden"
        style={{
          background: 'linear-gradient(160deg, oklch(0.14 0.045 258) 0%, oklch(0.11 0.035 255) 60%, oklch(0.10 0.03 252) 100%)',
          borderRight: '1px solid oklch(0.22 0.05 255)',
        }}
      >
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse 80% 35% at 50% -5%, oklch(0.55 0.14 225 / 0.12) 0%, transparent 70%)' }}
        />

        {/* Header */}
        <div
          className="relative flex items-center gap-3.5 px-5 shrink-0"
          style={{
            paddingTop: 'max(env(safe-area-inset-top), 20px)',
            paddingBottom: '20px',
            borderBottom: '1px solid oklch(0.22 0.05 255)',
          }}
        >
          <div className="relative w-10 h-10 shrink-0">
            <div className="absolute inset-0 rounded-xl blur-sm opacity-60"
              style={{ background: 'linear-gradient(135deg, oklch(0.60 0.18 230), oklch(0.45 0.20 260))' }}
            />
            <div className="relative w-10 h-10 rounded-xl border border-white/20 flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, oklch(0.50 0.18 230 / 0.9), oklch(0.38 0.20 260 / 0.9))' }}
            >
              <img src="/logo_macabi.png" alt="Macabi" className="w-6 h-6 object-contain brightness-0 invert" />
            </div>
          </div>
          <div>
            <p className="font-bold text-[17px] tracking-wide text-white leading-none">Macabi</p>
            <p className="text-xs mt-1" style={{ color: 'oklch(0.65 0.06 230)' }}>Madrijim</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="relative flex-1 overflow-y-auto px-3 py-5 space-y-0.5">
          <p className="px-3 pb-2.5 text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'oklch(0.62 0.04 240)' }}>
            General
          </p>
          {participantNavItems.map((item) => {
            const isActive = item.isActive(pathname)
            const Icon = item.icon
            return (
              <DrawerClose key={item.href} asChild>
                <Link
                  to={item.href}
                  className={cn(
                    'group relative flex items-center gap-3.5 px-3 py-3.5 rounded-xl text-[15px] font-medium transition-all duration-200',
                    isActive ? 'text-white' : 'text-white/55 hover:text-white',
                  )}
                  style={isActive ? {
                    background: 'linear-gradient(90deg, oklch(0.55 0.14 225 / 0.22), oklch(0.55 0.14 225 / 0.08))',
                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)',
                  } : {}}
                >
                  {isActive && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 rounded-full"
                      style={{ background: 'linear-gradient(180deg, oklch(0.75 0.15 215), oklch(0.58 0.18 240))' }}
                    />
                  )}
                  <span className="flex items-center justify-center w-9 h-9 rounded-xl shrink-0 transition-all duration-200"
                    style={isActive ? {
                      background: 'oklch(0.55 0.14 225 / 0.30)',
                      color: 'white',
                      boxShadow: '0 0 12px oklch(0.60 0.18 225 / 0.3)',
                    } : { color: 'inherit' }}
                  >
                    <Icon className="w-5 h-5" />
                  </span>
                  <span className="flex-1">{item.label}</span>
                  {isActive && <ChevronRight className="w-4 h-4 shrink-0 opacity-40" />}
                </Link>
              </DrawerClose>
            )
          })}

          {isAdmin && (
            <>
              <div className="my-4 mx-1"
                style={{ height: '1px', background: 'linear-gradient(90deg, transparent, oklch(0.28 0.05 255), transparent)' }}
              />
              <div className="flex items-center gap-2 px-3 pb-2.5">
                <ShieldCheck className="w-3.5 h-3.5" style={{ color: 'oklch(0.75 0.15 80)' }} />
                <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'oklch(0.75 0.15 80)' }}>
                  Administración
                </p>
              </div>
              {adminNavItems.map((item) => {
                const isActive = pathname.startsWith(item.href)
                const Icon = item.icon
                return (
                  <DrawerClose key={item.href} asChild>
                    <Link
                      to={item.href}
                      className={cn(
                        'group relative flex items-center gap-3.5 px-3 py-3.5 rounded-xl text-[15px] font-medium transition-all duration-200',
                        isActive ? 'text-white' : 'text-white/55 hover:text-white',
                      )}
                      style={isActive ? {
                        background: 'linear-gradient(90deg, oklch(0.70 0.15 80 / 0.18), oklch(0.70 0.15 80 / 0.06))',
                        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
                      } : {}}
                    >
                      {isActive && (
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 rounded-full"
                          style={{ background: 'linear-gradient(180deg, oklch(0.85 0.16 85), oklch(0.70 0.18 70))' }}
                        />
                      )}
                      <span className="flex items-center justify-center w-9 h-9 rounded-xl shrink-0 transition-all duration-200"
                        style={isActive ? {
                          background: 'oklch(0.72 0.15 80 / 0.25)',
                          color: 'oklch(0.88 0.14 85)',
                          boxShadow: '0 0 12px oklch(0.72 0.15 80 / 0.25)',
                        } : { color: 'inherit' }}
                      >
                        <Icon className="w-5 h-5" />
                      </span>
                      <span className="flex-1">{item.label}</span>
                      {isActive && <ChevronRight className="w-4 h-4 shrink-0 opacity-40" />}
                    </Link>
                  </DrawerClose>
                )
              })}
            </>
          )}
        </nav>

        {/* User footer */}
        {user && (
          <div className="relative shrink-0 px-3 pb-3"
            style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 12px)' }}
          >
            <div className="mx-1 mb-3"
              style={{ height: '1px', background: 'linear-gradient(90deg, transparent, oklch(0.26 0.05 255), transparent)' }}
            />
            <div className="flex items-center gap-3 px-3 py-3.5 rounded-2xl"
              style={{
                background: 'oklch(0.18 0.04 255 / 0.7)',
                border: '1px solid oklch(0.28 0.05 255)',
              }}
            >
              <div className="relative shrink-0">
                <div className="absolute -inset-0.5 rounded-full opacity-80"
                  style={{ background: 'linear-gradient(135deg, oklch(0.65 0.15 225), oklch(0.55 0.18 260))' }}
                />
                <Avatar className="relative h-10 w-10">
                  <AvatarFallback className="font-bold text-sm text-white border-0"
                    style={{ background: 'linear-gradient(135deg, oklch(0.45 0.18 230), oklch(0.35 0.20 260))' }}
                  >
                    {userInitials}
                  </AvatarFallback>
                </Avatar>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate leading-none">{user.name}</p>
                {isAdmin ? (
                  <span className="inline-flex items-center gap-0.5 mt-1.5 px-1.5 py-0.5 rounded-full text-[9px] font-semibold uppercase tracking-wide"
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
                  <p className="text-[11px] mt-0.5 truncate" style={{ color: 'oklch(0.55 0.04 240)' }}>{user.email}</p>
                )}
              </div>
              <DrawerClose asChild>
                <button
                  onClick={onOpenPw}
                  className="p-2.5 rounded-xl transition-colors cursor-pointer"
                  style={{ color: 'oklch(0.55 0.04 240)' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'white'; (e.currentTarget as HTMLButtonElement).style.background = 'oklch(0.95 0 0 / 0.08)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'oklch(0.55 0.04 240)'; (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
                  title="Cambiar contraseña"
                >
                  <KeyRound className="w-4 h-4" />
                </button>
              </DrawerClose>
              <button
                onClick={onLogout}
                className="p-2.5 rounded-xl transition-colors cursor-pointer"
                style={{ color: 'oklch(0.55 0.04 240)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'oklch(0.65 0.18 25)'; (e.currentTarget as HTMLButtonElement).style.background = 'oklch(0.52 0.19 25 / 0.12)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'oklch(0.55 0.04 240)'; (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
                title="Cerrar sesión"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </DrawerContent>
    </Drawer>
  )
}
