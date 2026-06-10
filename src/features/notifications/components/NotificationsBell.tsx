import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell } from 'lucide-react'

import { getRequest } from '@/features/stock/api/requestsApi'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Drawer, DrawerContent, DrawerTrigger } from '@/components/ui/drawer'
import { useAuth } from '@/hooks/useAuth'
import { useIsMobile } from '@/hooks/useIsMobile'
import { cn } from '@/lib/utils'
import { NotificationsPanelContent } from './NotificationsPanelContent'
import { useNotifications, type AppNotification } from '../hooks/useNotifications'

type Props = {
  token: string
  /** Applied to the trigger button */
  className?: string
}

export function NotificationsBell({ token, className }: Props) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const isMobile = useIsMobile()
  const [open, setOpen] = useState(false)

  const { notifications, unread, isLoading, isError, markOne, markAll, isMarkingAll, refetch } =
    useNotifications(token, open)

  function handleNotificationClick(n: AppNotification) {
    markOne(n)
    setOpen(false)

    if (n.kind === 'stock') {
      void (async () => {
        try {
          const detail = await getRequest(token, n.request_id)
          navigate(`/app/stock/requests/${detail.id}`)
        } catch {
          navigate('/app/stock')
        }
      })()
      return
    }

    if (user?.role === 'admin') {
      navigate(`/app/admin/gastos/${n.expense_id}`)
    } else {
      navigate(`/app/gastos/${n.expense_id}`)
    }
  }

  const trigger = (
    <button
      className={cn(
        'relative p-1.5 rounded-md text-sidebar-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors',
        className,
      )}
      title="Notificaciones"
      aria-label={`Notificaciones${unread > 0 ? ` (${unread} sin leer)` : ''}`}
    >
      <Bell className="w-4 h-4" />
      {unread > 0 && (
        <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-destructive-foreground leading-none">
          {unread > 9 ? '9+' : unread}
        </span>
      )}
    </button>
  )

  const panelContent = (
    <NotificationsPanelContent
      notifications={notifications}
      unread={unread}
      isLoading={isLoading}
      isError={isError}
      onItemClick={handleNotificationClick}
      onMarkOne={markOne}
      onMarkAll={markAll}
      isMarkingAll={isMarkingAll}
      onRefetch={refetch}
      isDrawer={isMobile}
    />
  )

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={setOpen} direction="bottom">
        <DrawerTrigger asChild>{trigger}</DrawerTrigger>
        <DrawerContent className="max-h-[85vh] p-0 flex flex-col">
          <div className="flex-1 min-h-0 overflow-hidden flex flex-col pb-[env(safe-area-inset-bottom)]">
            {panelContent}
          </div>
        </DrawerContent>
      </Drawer>
    )
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-[22rem] p-0 overflow-hidden max-h-[min(28rem,80vh)]"
        sideOffset={8}
      >
        {panelContent}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
