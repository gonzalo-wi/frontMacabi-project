import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  listNotifications,
  markNotificationRead,
  getUnreadCount,
} from '@/features/stock/api/notificationsApi'
import type { StockNotificationDTO } from '@/features/stock/model/types'
import { cn } from '@/lib/utils'

/** Relative time helper (es-AR) */
function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diff / 60_000)
  if (min < 1) return 'ahora'
  if (min < 60) return `hace ${min} min`
  const hs = Math.floor(min / 60)
  if (hs < 24) return `hace ${hs} h`
  const days = Math.floor(hs / 24)
  return `hace ${days} día${days === 1 ? '' : 's'}`
}

type Props = {
  token: string
  /** Applied to the trigger button */
  className?: string
}

export function NotificationsBell({ token, className }: Props) {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  // ── Unread count — polled every 60 s ─────────────────────
  const countQ = useQuery({
    queryKey: ['stock-notifications-unread', token],
    queryFn: () => getUnreadCount(token),
    refetchInterval: 60_000,
    staleTime: 30_000,
  })

  const unread = countQ.data?.unread_count ?? 0

  // ── Full list — fetched when panel opens ─────────────────
  const listQ = useQuery({
    queryKey: ['stock-notifications-list', token],
    queryFn: () => listNotifications(token),
    enabled: open,
    staleTime: 30_000,
  })

  // ── Mark as read ─────────────────────────────────────────
  const markM = useMutation({
    mutationFn: (id: string) => markNotificationRead(token, id),
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['stock-notifications-unread'] }),
        qc.invalidateQueries({ queryKey: ['stock-notifications-list'] }),
      ])
    },
  })

  function handleOpen(v: boolean) {
    setOpen(v)
  }

  function handleNotificationClick(n: StockNotificationDTO) {
    if (!n.read_at) markM.mutate(n.id)
    setOpen(false)
    navigate(`/app/admin/stock/requests/${n.request_id}`)
  }

  const notifications = listQ.data ?? []
  const LIMIT = 10
  const visible = notifications.slice(0, LIMIT)
  const hasMore = notifications.length > LIMIT

  return (
    <DropdownMenu open={open} onOpenChange={handleOpen}>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            'relative p-1.5 rounded-md text-sidebar-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors',
            className,
          )}
          title="Notificaciones"
          aria-label={`Notificaciones${unread > 0 ? ` (${unread} sin leer)` : ''}`}
        >
          <Bell className="w-3.5 h-3.5" />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white leading-none">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-80 p-0 overflow-hidden"
        sideOffset={8}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/40">
          <p className="text-sm font-semibold">Notificaciones</p>
          {unread > 0 && (
            <span className="text-[10px] font-medium bg-red-500 text-white px-1.5 py-0.5 rounded-full">
              {unread} sin leer
            </span>
          )}
        </div>

        {/* Body */}
        <div className="max-h-80 overflow-y-auto divide-y divide-border">
          {listQ.isLoading && (
            <div className="flex justify-center py-6">
              <span className="text-xs text-muted-foreground animate-pulse">Cargando…</span>
            </div>
          )}

          {!listQ.isLoading && notifications.length === 0 && (
            <div className="flex flex-col items-center justify-center py-8 gap-2 text-muted-foreground">
              <Bell className="w-7 h-7 opacity-30" />
              <p className="text-xs">No tenés notificaciones</p>
            </div>
          )}

          {visible.map((n) => (
            <button
              key={n.id}
              onClick={() => handleNotificationClick(n)}
              className={cn(
                'w-full text-left px-4 py-3 transition-colors hover:bg-muted/50 focus:outline-none focus-visible:bg-muted/50',
                !n.read_at && 'bg-blue-500/5',
              )}
            >
              <div className="flex items-start gap-2.5">
                {/* Unread indicator */}
                <span
                  className={cn(
                    'mt-1.5 shrink-0 w-1.5 h-1.5 rounded-full',
                    n.read_at ? 'bg-transparent' : 'bg-blue-500',
                  )}
                />
                <div className="flex-1 min-w-0">
                  <p
                    className={cn(
                      'text-xs leading-snug',
                      n.read_at ? 'text-muted-foreground' : 'text-foreground font-medium',
                    )}
                  >
                    {n.message}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {relativeTime(n.created_at)}
                  </p>
                </div>
              </div>
            </button>
          ))}

          {hasMore && (
            <p className="text-center text-[10px] text-muted-foreground py-2 border-t">
              Mostrando las últimas {LIMIT} notificaciones
            </p>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
