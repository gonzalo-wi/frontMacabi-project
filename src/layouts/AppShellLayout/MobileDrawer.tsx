import { Drawer, DrawerContent } from '@/components/ui/drawer'

import { NavShellContent } from './NavShellContent'

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
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse 80% 35% at 50% -5%, oklch(0.55 0.14 225 / 0.12) 0%, transparent 70%)' }}
        />

        <div
          className="relative flex items-center gap-3.5 px-5 shrink-0"
          style={{
            paddingTop: 'max(env(safe-area-inset-top), 20px)',
            paddingBottom: '20px',
            borderBottom: '1px solid oklch(0.22 0.05 255)',
          }}
        >
          <div className="relative w-10 h-10 shrink-0">
            <div
              className="absolute inset-0 rounded-xl blur-sm opacity-60"
              style={{ background: 'linear-gradient(135deg, oklch(0.60 0.18 230), oklch(0.45 0.20 260))' }}
            />
            <div
              className="relative w-10 h-10 rounded-xl border border-white/20 flex items-center justify-center"
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

        <NavShellContent
          variant="drawer"
          pathname={pathname}
          isAdmin={isAdmin}
          user={user}
          userInitials={userInitials}
          onOpenPw={onOpenPw}
          onLogout={onLogout}
        />
      </DrawerContent>
    </Drawer>
  )
}
