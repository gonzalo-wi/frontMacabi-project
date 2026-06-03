import { useState } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { PullToRefresh } from '@/components/PullToRefresh'
import {
  LayoutDashboard,
  CalendarDays,
  FolderKanban,
  LogOut,
  Menu,
  Package,
  Receipt,
  ShieldCheck,
  Users,
  KeyRound,
  X,
  Loader2,
  ChevronRight,
} from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Drawer,
  DrawerContent,
  DrawerClose,
} from '@/components/ui/drawer'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { changePassword } from '@/lib/api/auth'
import { GlobalLoadingBar } from '@/components/GlobalLoadingBar'

/** Navegación del participante / coordinador fuera del área admin. */
const participantNavItems: {
  label: string
  href: string
  icon: typeof LayoutDashboard
  isActive: (pathname: string) => boolean
}[] = [
  { label: 'Panel', href: '/app', icon: LayoutDashboard, isActive: (p) => p === '/app' },
  {
    label: 'Stock',
    href: '/app/stock',
    icon: Package,
    isActive: (p) => p.startsWith('/app/stock'),
  },
  {
    label: 'Gastos',
    href: '/app/gastos',
    icon: Receipt,
    isActive: (p) => p.startsWith('/app/gastos'),
  },
]
const adminNavItems = [
  { label: 'Jornadas', href: '/app/admin/jornadas', icon: CalendarDays },
  { label: 'Proyectos', href: '/app/admin/proyectos', icon: FolderKanban },
  { label: 'Gastos', href: '/app/admin/gastos', icon: Receipt },
  { label: 'Stock', href: '/app/admin/stock', icon: Package },
  { label: 'Usuarios', href: '/app/admin/usuarios', icon: Users },
]

const mobileNavItems = [
  { label: 'Inicio', href: '/app', icon: LayoutDashboard, isActive: (p: string) => p === '/app' },
  {
    label: 'Stock',
    href: '/app/stock',
    icon: Package,
    isActive: (p: string) => p.startsWith('/app/stock'),
  },
  {
    label: 'Gastos',
    href: '/app/gastos',
    icon: Receipt,
    isActive: (p: string) => p.startsWith('/app/gastos'),
  },
]

export function AppShellLayout() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user, logout, token } = useAuth()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [pwOpen, setPwOpen] = useState(false)
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [pwError, setPwError] = useState('')
  const [pwSuccess, setPwSuccess] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/', { replace: true })
  }

  const isAdmin = user?.role === 'admin'

  const canPullToRefresh =
    Boolean(token) &&
    !drawerOpen &&
    !pwOpen &&
    typeof window !== 'undefined' &&
    window.matchMedia('(max-width: 1023px)').matches

  async function handlePullToRefresh() {
    await queryClient.invalidateQueries({ refetchType: 'active' })
  }

  const pwMutation = useMutation({
    mutationFn: () => changePassword(token!, { current_password: currentPw, new_password: newPw }),
    onSuccess: () => {
      setPwSuccess(true)
      setCurrentPw('')
      setNewPw('')
      setTimeout(() => { setPwOpen(false); setPwSuccess(false) }, 1500)
    },
    onError: () => setPwError('Contraseña actual incorrecta o error al cambiar'),
  })

  function openPw() {
    setCurrentPw(''); setNewPw(''); setPwError(''); setPwSuccess(false)
    setPwOpen(true)
  }

  function handlePwSubmit(e: React.FormEvent) {
    e.preventDefault()
    setPwError('')
    if (!currentPw || !newPw) { setPwError('Completá ambos campos'); return }
    if (newPw.length < 6) { setPwError('La nueva contraseña debe tener al menos 6 caracteres'); return }
    pwMutation.mutate()
  }

  const userInitials = user?.name.split(' ').map((n) => n[0]).join('').slice(0, 2) ?? ''

  return (
    <div className="min-h-screen bg-background">
      <GlobalLoadingBar />

      {/* ── Desktop sidebar ───────────────────────────────── */}
      <aside className="hidden lg:flex flex-col fixed inset-y-0 left-0 w-64 z-50 overflow-hidden"
        style={{
          background: 'linear-gradient(160deg, oklch(0.14 0.045 258) 0%, oklch(0.11 0.035 255) 60%, oklch(0.10 0.03 252) 100%)',
          borderRight: '1px solid oklch(0.20 0.04 255)',
          boxShadow: '4px 0 24px -4px rgba(0,0,10,0.35)',
        }}
      >
        {/* Subtle noise / glow overlay */}
        <div className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse 80% 40% at 50% -10%, oklch(0.55 0.14 225 / 0.10) 0%, transparent 70%)',
          }}
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
              <img
                src="/logo_macabi.png"
                alt="Macabi"
                className="w-5 h-5 object-contain brightness-0 invert"
              />
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
                  isActive
                    ? 'text-white'
                    : 'text-white/55 hover:text-white/90',
                )}
                style={isActive ? {
                  background: 'linear-gradient(90deg, oklch(0.55 0.14 225 / 0.22), oklch(0.55 0.14 225 / 0.08))',
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)',
                } : {}}
              >
                {/* Left accent bar */}
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-full"
                    style={{ background: 'linear-gradient(180deg, oklch(0.75 0.15 215), oklch(0.58 0.18 240))' }}
                  />
                )}
                {/* Icon wrapper */}
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
                {isActive && (
                  <ChevronRight className="w-3.5 h-3.5 shrink-0 opacity-50" />
                )}
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
                    {/* Left accent bar — golden for admin */}
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
                    {isActive && (
                      <ChevronRight className="w-3.5 h-3.5 shrink-0 opacity-50" />
                    )}
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

        {/* User footer — desktop sidebar */}
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
              {/* Avatar with gradient ring */}
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
                  {isAdmin && (
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
                  )}
                  {!isAdmin && (
                    <span className="text-[10px]" style={{ color: 'oklch(0.55 0.04 240)' }}>
                      {user.email}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-0.5">
                <button
                  onClick={openPw}
                  className="p-1.5 rounded-lg transition-all duration-150 cursor-pointer"
                  style={{ color: 'oklch(0.55 0.04 240)' }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLButtonElement).style.color = 'white';
                    (e.currentTarget as HTMLButtonElement).style.background = 'oklch(0.95 0 0 / 0.08)';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLButtonElement).style.color = 'oklch(0.55 0.04 240)';
                    (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                  }}
                  title="Cambiar contraseña"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={handleLogout}
                  className="p-1.5 rounded-lg transition-all duration-150 cursor-pointer"
                  style={{ color: 'oklch(0.55 0.04 240)' }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLButtonElement).style.color = 'oklch(0.65 0.18 25)';
                    (e.currentTarget as HTMLButtonElement).style.background = 'oklch(0.52 0.19 25 / 0.12)';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLButtonElement).style.color = 'oklch(0.55 0.04 240)';
                    (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                  }}
                  title="Cerrar sesión"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* ── Main content area ─────────────────────────────── */}
      <main className="lg:pl-64 min-h-screen">
        <div className="pb-24 lg:pb-0">
          <PullToRefresh isPullable={canPullToRefresh} onRefresh={handlePullToRefresh}>
            <Outlet />
          </PullToRefresh>
        </div>
      </main>

      {/* ── Mobile: bottom navigation bar ──────────────────── */}
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
                  isActive
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-foreground'
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
            onClick={() => setDrawerOpen(true)}
            className="flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl text-muted-foreground hover:text-foreground transition-all duration-200 active:scale-90 select-none cursor-pointer"
          >
            <div className="p-1">
              <Menu className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-semibold tracking-wide">Más</span>
          </button>
        </nav>
      </div>

      {/* ── Mobile: drawer ────────────────────────────────── */}
      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen} direction="left">
        <DrawerContent className="w-[80vw] max-w-[300px] h-full flex flex-col rounded-none border-r p-0 overflow-hidden"
          style={{
            background: 'linear-gradient(160deg, oklch(0.14 0.045 258) 0%, oklch(0.11 0.035 255) 60%, oklch(0.10 0.03 252) 100%)',
            borderRight: '1px solid oklch(0.22 0.05 255)',
          }}
        >
          {/* Glow overlay */}
          <div className="absolute inset-0 pointer-events-none"
            style={{
              background: 'radial-gradient(ellipse 80% 35% at 50% -5%, oklch(0.55 0.14 225 / 0.12) 0%, transparent 70%)',
            }}
          />

          {/* Header */}
          <div className="relative flex items-center gap-3 px-5 py-5 shrink-0"
            style={{ borderBottom: '1px solid oklch(0.22 0.05 255)' }}
          >
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
            <div>
              <p className="font-bold text-base tracking-wide text-white leading-none">Macabi</p>
              <p className="text-[11px] mt-0.5" style={{ color: 'oklch(0.65 0.06 230)' }}>Madrijim</p>
            </div>
          </div>

          {/* Nav */}
          <nav className="relative flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
            <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'oklch(0.62 0.04 240)' }}>
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
                      'group relative flex items-center gap-3.5 px-3 py-3 rounded-xl text-sm font-medium transition-all duration-200',
                      isActive ? 'text-white' : 'text-white/50 hover:text-white',
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
                    <span className="flex items-center justify-center w-8 h-8 rounded-lg shrink-0 transition-all duration-200"
                      style={isActive ? {
                        background: 'oklch(0.55 0.14 225 / 0.30)',
                        color: 'white',
                        boxShadow: '0 0 12px oklch(0.60 0.18 225 / 0.3)',
                      } : { color: 'inherit' }}
                    >
                      <Icon className="w-4.5 h-4.5" />
                    </span>
                    <span className="flex-1">{item.label}</span>
                    {isActive && <ChevronRight className="w-4 h-4 shrink-0 opacity-40" />}
                  </Link>
                </DrawerClose>
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
                    <DrawerClose key={item.href} asChild>
                      <Link
                        to={item.href}
                        className={cn(
                          'group relative flex items-center gap-3.5 px-3 py-3 rounded-xl text-sm font-medium transition-all duration-200',
                          isActive ? 'text-white' : 'text-white/50 hover:text-white',
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
                        <span className="flex items-center justify-center w-8 h-8 rounded-lg shrink-0 transition-all duration-200"
                          style={isActive ? {
                            background: 'oklch(0.72 0.15 80 / 0.25)',
                            color: 'oklch(0.88 0.14 85)',
                            boxShadow: '0 0 12px oklch(0.72 0.15 80 / 0.25)',
                          } : { color: 'inherit' }}
                        >
                          <Icon className="w-4.5 h-4.5" />
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

          {/* User footer — mobile drawer */}
          {user && (
            <div className="relative shrink-0 p-3">
              <div className="mx-1 mb-3"
                style={{ height: '1px', background: 'linear-gradient(90deg, transparent, oklch(0.26 0.05 255), transparent)' }}
              />
              <div className="flex items-center gap-3 px-3 py-3 rounded-xl"
                style={{
                  background: 'oklch(0.18 0.04 255 / 0.7)',
                  border: '1px solid oklch(0.28 0.05 255)',
                }}
              >
                <div className="relative shrink-0">
                  <div className="absolute -inset-0.5 rounded-full opacity-80"
                    style={{ background: 'linear-gradient(135deg, oklch(0.65 0.15 225), oklch(0.55 0.18 260))' }}
                  />
                  <Avatar className="relative h-9 w-9">
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
                    <span className="inline-flex items-center gap-0.5 mt-1 px-1.5 py-0.5 rounded-full text-[9px] font-semibold uppercase tracking-wide"
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
                    <p className="text-[10px] mt-0.5 truncate" style={{ color: 'oklch(0.55 0.04 240)' }}>{user.email}</p>
                  )}
                </div>
                <DrawerClose asChild>
                  <button
                    onClick={openPw}
                    className="p-2 rounded-lg transition-colors cursor-pointer"
                    style={{ color: 'oklch(0.55 0.04 240)' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = 'white'; (e.currentTarget as HTMLButtonElement).style.background = 'oklch(0.95 0 0 / 0.08)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = 'oklch(0.55 0.04 240)'; (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
                    title="Cambiar contraseña"
                  >
                    <KeyRound className="w-4 h-4" />
                  </button>
                </DrawerClose>
                <button
                  onClick={handleLogout}
                  className="p-2 rounded-lg transition-colors cursor-pointer"
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

      {/* ── Change password — Dialog (desktop) ─────────── */}
      <Dialog open={pwOpen} onOpenChange={(o: boolean) => !o && setPwOpen(false)}>
        <DialogContent className="hidden lg:grid sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cambiar contraseña</DialogTitle>
          </DialogHeader>
          <PwForm
            pwSuccess={pwSuccess}
            currentPw={currentPw}
            setCurrentPw={setCurrentPw}
            newPw={newPw}
            setNewPw={setNewPw}
            pwError={pwError}
            isPending={pwMutation.isPending}
            onSubmit={handlePwSubmit}
          />
        </DialogContent>
      </Dialog>

      {/* ── Change password — Drawer (mobile) ───────────── */}
      <Drawer open={pwOpen} onOpenChange={(o) => !o && setPwOpen(false)} direction="bottom">
        <DrawerContent className="lg:hidden px-0 pb-0">
          <div className="px-5 pt-4 pb-8 space-y-5 max-w-md mx-auto w-full">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-base">Cambiar contraseña</h3>
              <button
                onClick={() => setPwOpen(false)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <PwForm
              pwSuccess={pwSuccess}
              currentPw={currentPw}
              setCurrentPw={setCurrentPw}
              newPw={newPw}
              setNewPw={setNewPw}
              pwError={pwError}
              isPending={pwMutation.isPending}
              onSubmit={handlePwSubmit}
            />
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  )
}

function PwForm({
  pwSuccess, currentPw, setCurrentPw, newPw, setNewPw, pwError, isPending, onSubmit,
}: {
  pwSuccess: boolean
  currentPw: string
  setCurrentPw: (v: string) => void
  newPw: string
  setNewPw: (v: string) => void
  pwError: string
  isPending: boolean
  onSubmit: (e: React.FormEvent) => void
}) {
  if (pwSuccess) {
    return (
      <div className="flex flex-col items-center py-6 gap-2 text-green-600">
        <KeyRound className="w-8 h-8" />
        <p className="font-medium">¡Contraseña actualizada!</p>
      </div>
    )
  }
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="current-pw">Contraseña actual</Label>
        <Input
          id="current-pw"
          type="password"
          value={currentPw}
          onChange={(e) => setCurrentPw(e.target.value)}
          placeholder="••••••••"
          className="h-11"
          autoComplete="current-password"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="new-pw">Nueva contraseña</Label>
        <Input
          id="new-pw"
          type="password"
          value={newPw}
          onChange={(e) => setNewPw(e.target.value)}
          placeholder="••••••••"
          className="h-11"
          autoComplete="new-password"
        />
      </div>

      {pwError && (
        <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">
          {pwError}
        </p>
      )}

      <Button type="submit" className="w-full h-11" disabled={isPending}>
        {isPending
          ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Guardando...</>
          : 'Cambiar contraseña'
        }
      </Button>
    </form>
  )
}
