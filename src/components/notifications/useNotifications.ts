import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  listNotifications as listStockNotifications,
  markNotificationRead as markStockNotificationRead,
  getUnreadCount as getStockUnreadCount,
  markAllNotificationsRead as markAllStockNotificationsRead,
} from '@/features/stock/api/notificationsApi'
import {
  listExpenseNotifications,
  markExpenseNotificationRead,
  getExpenseUnreadCount,
  markAllExpenseNotificationsRead,
} from '@/features/expenses/api/notificationsApi'

export type AppNotification =
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

export function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diff / 60_000)
  if (min < 1) return 'ahora'
  if (min < 60) return `hace ${min} min`
  const hs = Math.floor(min / 60)
  if (hs < 24) return `hace ${hs} h`
  const days = Math.floor(hs / 24)
  return `hace ${days} día${days === 1 ? '' : 's'}`
}

export function useNotifications(token: string, open: boolean) {
  const qc = useQueryClient()

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

  const markAllM = useMutation({
    mutationFn: () =>
      Promise.all([
        markAllStockNotificationsRead(token),
        markAllExpenseNotificationsRead(token),
      ]),
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['stock-notifications-unread'] }),
        qc.invalidateQueries({ queryKey: ['stock-notifications-list'] }),
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

  function markOne(n: AppNotification) {
    if (n.read_at) return
    if (n.kind === 'stock') markStockM.mutate(n.id)
    else markExpenseM.mutate(n.id)
  }

  return {
    notifications,
    unread,
    isLoading: stockListQ.isLoading || expenseListQ.isLoading,
    isError: stockListQ.isError || expenseListQ.isError,
    refetch: () => {
      void stockListQ.refetch()
      void expenseListQ.refetch()
    },
    markOne,
    markAll: () => markAllM.mutate(),
    isMarkingAll: markAllM.isPending,
  }
}

// Keep open state + LIMIT logic here so both containers share the same hook call
export const NOTIFICATIONS_LIMIT = 10

export function useNotificationsPanel() {
  const [open, setOpen] = useState(false)
  return { open, setOpen }
}
