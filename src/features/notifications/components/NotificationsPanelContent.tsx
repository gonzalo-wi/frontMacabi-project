import { Check, Package, Receipt, Bell, X, RefreshCw } from 'lucide-react'

import { cn } from '@/lib/utils'
import { DrawerClose } from '@/components/ui/drawer'
import { type AppNotification, relativeTime, NOTIFICATIONS_LIMIT } from '../hooks/useNotifications'

type Props = {
  notifications: AppNotification[]
  unread: number
  isLoading: boolean
  isError: boolean
  onItemClick: (n: AppNotification) => void
  onMarkOne: (n: AppNotification) => void
  onMarkAll: () => void
  isMarkingAll: boolean
  onRefetch: () => void
  /** Passed only when inside a Drawer; renders the X close button */
  isDrawer?: boolean
}

export function NotificationsPanelContent({
  notifications,
  unread,
  isLoading,
  isError,
  onItemClick,
  onMarkOne,
  onMarkAll,
  isMarkingAll,
  onRefetch,
  isDrawer = false,
}: Props) {
  const visible = notifications.slice(0, NOTIFICATIONS_LIMIT)
  const hasMore = notifications.length > NOTIFICATIONS_LIMIT

  return (
    <div className="flex flex-col h-full">
      {/* ── Header ───────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/40 shrink-0">
        <div className="flex items-center gap-2">
          {isDrawer && (
            <DrawerClose asChild>
              <button
                className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors mr-1"
                aria-label="Cerrar"
              >
                <X className="w-4 h-4" />
              </button>
            </DrawerClose>
          )}
          <p className="text-sm font-semibold">Notificaciones</p>
          {unread > 0 && (
            <span className="text-[10px] font-medium bg-destructive text-destructive-foreground px-1.5 py-0.5 rounded-full">
              {unread} sin leer
            </span>
          )}
        </div>
        {unread > 0 && (
          <button
            onClick={onMarkAll}
            disabled={isMarkingAll}
            className="text-[11px] text-primary hover:underline disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 transition-opacity"
          >
            {isMarkingAll ? (
              <RefreshCw className="w-3 h-3 animate-spin" />
            ) : (
              <Check className="w-3 h-3" />
            )}
            Marcar todas como leídas
          </button>
        )}
      </div>

      {/* ── List ─────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto divide-y divide-border min-h-0">
        {/* Loading skeleton */}
        {isLoading && (
          <div className="divide-y divide-border">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3 px-4 py-3.5 animate-pulse">
                <div className="mt-0.5 w-7 h-7 rounded-lg bg-muted shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-muted rounded w-4/5" />
                  <div className="h-2.5 bg-muted rounded w-2/5" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error state */}
        {!isLoading && isError && (
          <div className="flex flex-col items-center justify-center py-10 gap-3 text-muted-foreground px-4 text-center">
            <Bell className="w-8 h-8 opacity-30" />
            <p className="text-sm">No pudimos cargar las notificaciones</p>
            <button
              onClick={onRefetch}
              className="text-xs text-primary hover:underline flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" />
              Reintentar
            </button>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !isError && notifications.length === 0 && (
          <div className="flex flex-col items-center justify-center py-10 gap-2 text-muted-foreground">
            <Bell className="w-8 h-8 opacity-30" />
            <p className="text-sm">Estás al día</p>
            <p className="text-xs opacity-70">No tenés notificaciones nuevas</p>
          </div>
        )}

        {/* Notification items */}
        {!isLoading &&
          !isError &&
          visible.map((n) => (
            <NotificationRow
              key={`${n.kind}-${n.id}`}
              notification={n}
              onItemClick={onItemClick}
              onMarkOne={onMarkOne}
            />
          ))}

        {hasMore && (
          <p className="text-center text-[11px] text-muted-foreground py-2.5 border-t">
            Mostrando las últimas {NOTIFICATIONS_LIMIT} notificaciones
          </p>
        )}
      </div>
    </div>
  )
}

function NotificationRow({
  notification: n,
  onItemClick,
  onMarkOne,
}: {
  notification: AppNotification
  onItemClick: (n: AppNotification) => void
  onMarkOne: (n: AppNotification) => void
}) {
  return (
    <div
      className={cn(
        'group flex items-start gap-3 px-4 py-3.5 transition-colors',
        !n.read_at && 'bg-primary/5',
      )}
    >
      {/* Type icon */}
      <div
        className={cn(
          'mt-0.5 shrink-0 w-7 h-7 rounded-lg flex items-center justify-center',
          n.kind === 'stock'
            ? 'bg-primary/10 text-primary'
            : 'bg-accent/10 text-accent-foreground',
        )}
      >
        {n.kind === 'stock' ? (
          <Package className="w-3.5 h-3.5" />
        ) : (
          <Receipt className="w-3.5 h-3.5" />
        )}
      </div>

      {/* Content */}
      <button
        className="flex-1 min-w-0 text-left focus:outline-none"
        onClick={() => onItemClick(n)}
      >
        <p
          className={cn(
            'text-xs leading-snug',
            n.read_at ? 'text-muted-foreground' : 'text-foreground font-medium',
          )}
        >
          {n.message}
        </p>
        <p className="text-[11px] text-muted-foreground mt-0.5">{relativeTime(n.created_at)}</p>
      </button>

      {/* Mark-one-as-read button */}
      {!n.read_at && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onMarkOne(n)
          }}
          title="Marcar como leída"
          aria-label="Marcar como leída"
          className={cn(
            'shrink-0 p-1.5 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors',
            'min-w-[2rem] min-h-[2rem] flex items-center justify-center',
            'lg:opacity-0 lg:group-hover:opacity-100',
          )}
        >
          <Check className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  )
}
