import { NavShellContent } from './NavShellContent'

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
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 80% 40% at 50% -10%, oklch(0.55 0.14 225 / 0.10) 0%, transparent 70%)' }}
      />

      <div className="relative flex items-center gap-3 h-16 px-5 shrink-0">
        <div className="relative w-9 h-9 shrink-0">
          <div
            className="absolute inset-0 rounded-xl blur-sm opacity-60"
            style={{ background: 'linear-gradient(135deg, oklch(0.60 0.18 230), oklch(0.45 0.20 260))' }}
          />
          <div
            className="relative w-9 h-9 rounded-xl border border-white/20 flex items-center justify-center"
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

      <div
        className="relative mx-4"
        style={{ height: '1px', background: 'linear-gradient(90deg, transparent, oklch(0.30 0.06 255), transparent)' }}
      />

      <NavShellContent
        variant="sidebar"
        pathname={pathname}
        isAdmin={isAdmin}
        user={user}
        userInitials={userInitials}
        onOpenPw={onOpenPw}
        onLogout={onLogout}
      />
    </aside>
  )
}
