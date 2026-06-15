import { useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'

import { PullToRefresh } from '@/components/PullToRefresh'
import { GlobalLoadingBar } from '@/components/GlobalLoadingBar'
import { useAuth } from '@/hooks/useAuth'
import { useIsMobile, useMediaQuery } from '@/hooks/useIsMobile'
import { getPullRefreshRoots } from '@/lib/pullRefreshRoots'

import { MobileDrawer } from './MobileDrawer'
import { MobileNav } from './MobileNav'
import { PwChangeDialog } from './PwChangeDialog'
import { Sidebar } from './Sidebar'

export function AppShellLayout() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user, logout, token } = useAuth()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [pwOpen, setPwOpen] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/', { replace: true })
  }

  const isAdmin = user?.role === 'admin'

  const isMobile = useIsMobile()
  // Dialog en desktop / Drawer en mobile: gateamos por breakpoint (1024px = lg).
  const isDesktop = useMediaQuery('(min-width: 1024px)')
  const canPullToRefresh = Boolean(token) && !drawerOpen && !pwOpen && isMobile

  async function handlePullToRefresh() {
    const roots = getPullRefreshRoots(pathname)
    if (!roots) {
      await queryClient.invalidateQueries({ refetchType: 'active' })
      return
    }
    await Promise.all(
      roots.map((queryKey) => queryClient.invalidateQueries({ queryKey, refetchType: 'active' })),
    )
  }

  const userInitials = user?.name.split(' ').map((n) => n[0]).join('').slice(0, 2) ?? ''

  return (
    <div className="min-h-screen bg-background">
      <GlobalLoadingBar />

      <Sidebar
        pathname={pathname}
        isAdmin={isAdmin}
        user={user}
        userInitials={userInitials}
        onOpenPw={() => setPwOpen(true)}
        onLogout={handleLogout}
      />

      {/* ── Main content area ─────────────────────────────── */}
      <main className="lg:pl-64 min-h-screen">
        <div className="pb-24 lg:pb-0">
          <PullToRefresh isPullable={canPullToRefresh} onRefresh={handlePullToRefresh}>
            <Outlet />
          </PullToRefresh>
        </div>
      </main>

      <MobileNav pathname={pathname} onOpenMore={() => setDrawerOpen(true)} />

      <MobileDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        pathname={pathname}
        isAdmin={isAdmin}
        user={user}
        userInitials={userInitials}
        onOpenPw={() => setPwOpen(true)}
        onLogout={handleLogout}
      />

      <PwChangeDialog
        key={pwOpen ? 'pw-open' : 'pw-closed'}
        open={pwOpen}
        onOpenChange={setPwOpen}
        token={token ?? ''}
        isDesktop={isDesktop}
      />
    </div>
  )
}
