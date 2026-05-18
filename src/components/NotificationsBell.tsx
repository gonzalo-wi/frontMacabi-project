import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { getRequest } from '@/features/stock/api/requestsApi'
import {
  listNotifications as listStockNotifications,
  markNotificationRead as markStockNotificationRead,
  getUnreadCount as getStockUnreadCount,
} from '@/features/stock/api/notificationsApi'
import {
  listExpenseNotifications,
  markExpenseNotificationRead,
  getExpenseUnreadCount,
} from '@/features/expenses/api/notificationsApi'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'

type AppNotification =
  | {
      kind: 'stock'
      id: string
      message: string
      read_at: string | null
      created_at: string
      request_id: string
    }
  | {
      kind: 'expense'
      id: string
      message: string
      read_at: string | null
      created_at: string
      expense_id: string
      project_id: string
    }

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
  const { user } = useAuth()
  const [open, setOpen] = useState(false)

  const stockCountQ = useQuery({
    queryKey: ['stock-notifications-unread', token],
    queryFn: () => getStockUnreadCount(token),
    refetchInterval: 60_000,
    staleTime: 30_000,
  })

  const expenseCountQ = useQuery({
    queryKey: ['expense-notifications-unread', token],
    queryFn: () => getExpenseUnreadCount(token),
    refetchInterval: 60_000,
    staleTime: 30_000,
  })

  const unread =
    (stockCountQ.data?.unread_count ?? 0) + (expenseCountQ.data?.unread_count ?? 0)

  const stockListQ = useQuery({
    queryKey: ['stock-notifications-list', token],
    queryFn: () => listStockNotifications(token),
    enabled: open,
    staleTime: 30_000,
  })

  const expenseListQ = useQuery({
    queryKey: ['expense-notifications-list', token],
    queryFn: () => listExpenseNotifications(token),
    enabled: open,
    staleTime: 30_000,
  })

  const markStockM = useMutation({
    mutationFn: (id: string) => markStockNotificationRead(token, id),
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['stock-notifications-unread'] }),
        qc.invalidateQueries({ queryKey: ['stock-notifications-list'] }),
      ])
    },
  })

  const markExpenseM = useMutation({
    mutationFn: (id: string) => markExpenseNotificationRead(token, id),
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['expense-notifications-unread'] }),
        qc.invalidateQueries({ queryKey: ['expense-notifications-list'] }),
      ])
    },
  })

  const notifications = useMemo((): AppNotification[] => {
    const stock: AppNotification[] = (stockListQ.data ?? []).map((n) => ({
      kind: 'stock' as const,
      id: n.id,
      message: n.message,
      read_at: n.read_at,
      created_at: n.created_at,
      request_id: n.request_id,
    }))
    const expense: AppNotification[] = (expenseListQ.data ?? []).map((n) => ({
      kind: 'expense' as const,
      id: n.id,
      message: n.message,
      read_at: n.read_at,
      created_at: n.created_at,
      expense_id: n.expense_id,
      project_id: n.project_id,
    }))
    return [...stock, ...expense].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    )
  }, [expenseListQ.data, stockListQ.data])

  const isLoading = stockListQ.isLoading || expenseListQ.isLoading

  function handleOpen(v: boolean) {
    setOpen(v)
  }

  function handleNotificationClick(n: AppNotification) {
    if (!n.read_at) {
      if (n.kind === 'stock') markStockM.mutate(n.id)
      else markExpenseM.mutate(n.id)
    }
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
      navigate(`/app/admin/proyectos/${n.project_id}/gastos`)
    } else {
      navigate(`/app/gastos?project=${n.project_id}`)
    }
  }

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
        <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/40">
          <p className="text-sm font-semibold">Notificaciones</p>
          {unread > 0 && (
            <span className="text-[10px] font-medium bg-red-500 text-white px-1.5 py-0.5 rounded-full">
              {unread} sin leer
            </span>
          )}
        </div>

        <div className="max-h-80 overflow-y-auto divide-y divide-border">
          {isLoading && (
            <div className="flex justify-center py-6">
              <span className="text-xs text-muted-foreground animate-pulse">Cargando…</span>
            </div>
          )}

          {!isLoading && notifications.length === 0 && (
            <div className="flex flex-col items-center justify-center py-8 gap-2 text-muted-foreground">
              <Bell className="w-7 h-7 opacity-30" />
              <p className="text-xs">No tenés notificaciones</p>
            </div>
          )}

          {visible.map((n) => (
            <button
              key={`${n.kind}-${n.id}`}
              onClick={() => handleNotificationClick(n)}
              className={cn(
                'w-full text-left px-4 py-3 transition-colors hover:bg-muted/50 focus:outline-none focus-visible:bg-muted/50',
                !n.read_at && 'bg-blue-500/5',
              )}
            >
              <div className="flex items-start gap-2.5">
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
