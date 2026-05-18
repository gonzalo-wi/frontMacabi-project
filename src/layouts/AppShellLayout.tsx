import { useState } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import PullToRefresh from 'react-simple-pull-to-refresh'
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
import { NotificationsBell } from '@/components/NotificationsBell'

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

  return (
    <div className="min-h-screen bg-background">
      {/* ── Desktop sidebar ───────────────────────────────── */}
      <aside className="hidden lg:flex flex-col fixed inset-y-0 left-0 w-64 bg-sidebar z-50">
        {/* Brand */}
        <div className="flex items-center gap-3 h-16 px-5 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-sidebar-primary/15 border border-sidebar-primary/20 flex items-center justify-center shrink-0">
            <img
              src="/logo_macabi.png"
              alt="Macabi"
              className="w-5 h-5 object-contain brightness-0 invert"
            />
          </div>
          <div className="leading-none">
            <p className="font-bold text-sm text-sidebar-foreground">Macabi</p>
            <p className="text-[11px] text-sidebar-muted-foreground mt-0.5">Madrijim</p>
          </div>
        </div>

        <div className="h-px bg-sidebar-border mx-4" />

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
          {participantNavItems.map((item) => {
            const isActive = item.isActive(pathname)
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-foreground'
                    : 'text-sidebar-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-foreground',
                )}
              >
                <Icon
                  className={cn(
                    'w-4 h-4 shrink-0',
                    isActive ? 'text-sidebar-primary' : '',
                  )}
                />
                <span className="flex-1">{item.label}</span>
                {isActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-sidebar-primary shrink-0" />
                )}
              </Link>
            )
          })}
          {isAdmin && (
            <>
              <div className="h-px bg-sidebar-border mx-1 my-2" />
              <p className="px-3 text-[10px] font-semibold uppercase tracking-widest text-sidebar-muted-foreground mb-1">
                Administración
              </p>
              {adminNavItems.map((item) => {
                const isActive = pathname.startsWith(item.href)
                const Icon = item.icon
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
                      isActive
                        ? 'bg-sidebar-accent text-sidebar-foreground'
                        : 'text-sidebar-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-foreground',
                    )}
                  >
                    <Icon className={cn('w-4 h-4 shrink-0', isActive ? 'text-sidebar-primary' : '')} />
                    <span className="flex-1">{item.label}</span>
                    {isActive && <span className="w-1.5 h-1.5 rounded-full bg-sidebar-primary shrink-0" />}
                  </Link>
                )
              })}
            </>
          )}
        </nav>

        {/* User footer — desktop sidebar */}
        {user && (
          <div className="shrink-0 px-3 py-4 border-t border-sidebar-border">
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-sidebar-accent/60">
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarFallback className="bg-sidebar-primary/20 text-sidebar-primary font-semibold text-xs border border-sidebar-primary/30">
                  {user.name.split(' ').map((n) => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-sidebar-foreground truncate leading-none">{user.name}</p>
                <p className="text-[11px] text-sidebar-muted-foreground truncate mt-0.5">{user.email}</p>
              </div>
              <button
                onClick={openPw}
                className="p-1.5 rounded-md text-sidebar-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
                title="Cambiar contraseña"
              >
                <KeyRound className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleLogout}
                className="p-1.5 rounded-md text-sidebar-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
                title="Cerrar sesión"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </aside>

      {/* ── Main content area ─────────────────────────────── */}
      <main className="lg:pl-64 min-h-screen">
        <div className="pb-24 lg:pb-0">
          <PullToRefresh
            isPullable={canPullToRefresh}
            onRefresh={handlePullToRefresh}
            pullingContent="Soltá para actualizar"
            refreshingContent="Actualizando..."
            pullDownThreshold={70}
            maxPullDownDistance={95}
            resistance={2.5}
          >
            <div>
              <Outlet />
            </div>
          </PullToRefresh>
        </div>
      </main>

      {/* ── Mobile: floating menu button ──────────────────── */}
      <div className="lg:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
        <button
          onClick={() => setDrawerOpen(true)}
          className="flex items-center gap-2.5 bg-[#0D1B2A] text-white pl-4 pr-5 py-3 rounded-full shadow-xl shadow-black/30 border border-white/10 active:scale-95 transition-transform"
        >
          <Menu className="w-5 h-5" />
          <span className="text-sm font-semibold tracking-wide">Menú</span>
        </button>
      </div>

      {/* ── Notification bell — fixed top-right ───────────── */}
      {token && (
        <div className="fixed top-8 right-4 z-50 lg:top-4">
          <NotificationsBell
            token={token}
            className="p-2 rounded-full bg-background border border-border shadow-md hover:bg-muted text-foreground"
          />
        </div>
      )}

      {/* ── Mobile: drawer ────────────────────────────────── */}
      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen} direction="left">
        <DrawerContent className="w-[80vw] max-w-[300px] h-full flex flex-col bg-sidebar text-sidebar-foreground rounded-none border-r border-sidebar-border p-0">

          {/* Header */}
          <div className="flex items-center gap-3 px-5 py-5 border-b border-sidebar-border shrink-0">
            <div className="w-9 h-9 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center shrink-0">
              <img src="/logo_macabi.png" alt="Macabi" className="w-5 h-5 object-contain brightness-0 invert" />
            </div>
            <div>
              <p className="font-bold text-base text-sidebar-foreground leading-none">Macabi</p>
              <p className="text-[11px] text-sidebar-muted-foreground mt-0.5">Madrijim</p>
            </div>
          </div>

          {/* Nav */}
          <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
            {participantNavItems.map((item) => {
              const isActive = item.isActive(pathname)
              const Icon = item.icon
              return (
                <DrawerClose key={item.href} asChild>
                  <Link
                    to={item.href}
                    className={cn(
                      'flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-medium transition-all',
                      isActive
                        ? 'bg-white/15 text-white'
                        : 'text-sidebar-muted-foreground hover:bg-white/8 hover:text-white',
                    )}
                  >
                    <Icon className={cn('w-5 h-5 shrink-0', isActive ? 'text-blue-300' : '')} />
                    <span className="flex-1">{item.label}</span>
                    {isActive && <span className="w-2 h-2 rounded-full bg-blue-400 shrink-0" />}
                  </Link>
                </DrawerClose>
              )
            })}

            {isAdmin && (
              <>
                <div className="h-px bg-sidebar-border mx-2 my-3" />
                <div className="flex items-center gap-2 px-4 mb-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-amber-400">
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
                          'flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-medium transition-all',
                          isActive
                            ? 'bg-amber-500/20 text-amber-200'
                            : 'text-sidebar-muted-foreground hover:bg-amber-500/10 hover:text-amber-200',
                        )}
                      >
                        <Icon className={cn('w-5 h-5 shrink-0', isActive ? 'text-amber-400' : '')} />
                        <span className="flex-1">{item.label}</span>
                        {isActive && <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />}
                      </Link>
                    </DrawerClose>
                  )
                })}
              </>
            )}
          </nav>

          {/* User footer — mobile drawer */}
          {user && (
            <div className="shrink-0 px-3 py-4 border-t border-sidebar-border">
              <div className="flex items-center gap-3 px-3 py-3 rounded-xl bg-white/8">
                <Avatar className="h-9 w-9 shrink-0">
                  <AvatarFallback className="bg-white/15 text-white font-semibold text-xs">
                    {user.name.split(' ').map((n) => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate leading-none">{user.name}</p>
                  <p className="text-[11px] text-sidebar-muted-foreground truncate mt-0.5">{user.email}</p>
                </div>
                <DrawerClose asChild>
                  <button
                    onClick={openPw}
                    className="p-2 rounded-lg text-sidebar-muted-foreground hover:text-white hover:bg-white/10 transition-colors"
                    title="Cambiar contraseña"
                  >
                    <KeyRound className="w-4 h-4" />
                  </button>
                </DrawerClose>
                <button
                  onClick={handleLogout}
                  className="p-2 rounded-lg text-sidebar-muted-foreground hover:text-white hover:bg-white/10 transition-colors"
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
