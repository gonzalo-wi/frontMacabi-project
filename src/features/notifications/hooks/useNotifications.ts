import { useMemo } from 'react'
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
import {
  listEventNotifications,
  markEventNotificationRead,
  getEventUnreadCount,
  markAllEventNotificationsRead,
} from '@/features/events/api/notificationsApi'
import {
  listNewsNotifications,
  markNewsNotificationRead,
  getNewsUnreadCount,
  markAllNewsNotificationsRead,
} from '@/features/news/api/notificationsApi'
import { queryKeys } from '@/lib/queryKeys'

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
  | {
      kind: 'event'
      id: string
      message: string
      read_at: string | null
      created_at: string
      event_instance_id: string
    }
  | {
      kind: 'news'
      id: string
      message: string
      read_at: string | null
      created_at: string
      news_id: string
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
    queryKey: queryKeys.notifications.stockUnread(token),
    queryFn: () => getStockUnreadCount(token),
    refetchInterval: 60_000,
    staleTime: 30_000,
  })

  const expenseCountQ = useQuery({
    queryKey: queryKeys.notifications.expenseUnread(token),
    queryFn: () => getExpenseUnreadCount(token),
    refetchInterval: 60_000,
    staleTime: 30_000,
  })

  const eventCountQ = useQuery({
    queryKey: queryKeys.notifications.eventUnread(token),
    queryFn: () => getEventUnreadCount(token),
    refetchInterval: 60_000,
    staleTime: 30_000,
  })

  const newsCountQ = useQuery({
    queryKey: queryKeys.notifications.newsUnread(token),
    queryFn: () => getNewsUnreadCount(token),
    refetchInterval: 60_000,
    staleTime: 30_000,
  })

  const unread =
    (stockCountQ.data?.unread_count ?? 0) +
    (expenseCountQ.data?.unread_count ?? 0) +
    (eventCountQ.data?.unread_count ?? 0) +
    (newsCountQ.data?.unread_count ?? 0)

  const stockListQ = useQuery({
    queryKey: queryKeys.notifications.stockList(token),
    queryFn: () => listStockNotifications(token),
    enabled: open,
    staleTime: 30_000,
  })

  const expenseListQ = useQuery({
    queryKey: queryKeys.notifications.expenseList(token),
    queryFn: () => listExpenseNotifications(token),
    enabled: open,
    staleTime: 30_000,
  })

  const eventListQ = useQuery({
    queryKey: queryKeys.notifications.eventList(token),
    queryFn: () => listEventNotifications(token),
    enabled: open,
    staleTime: 30_000,
  })

  const newsListQ = useQuery({
    queryKey: queryKeys.notifications.newsList(token),
    queryFn: () => listNewsNotifications(token),
    enabled: open,
    staleTime: 30_000,
  })

  const markStockM = useMutation({
    mutationFn: (id: string) => markStockNotificationRead(token, id),
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: queryKeys.notifications.stockUnreadRoot() }),
        qc.invalidateQueries({ queryKey: queryKeys.notifications.stockListRoot() }),
      ])
    },
  })

  const markExpenseM = useMutation({
    mutationFn: (id: string) => markExpenseNotificationRead(token, id),
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: queryKeys.notifications.expenseUnreadRoot() }),
        qc.invalidateQueries({ queryKey: queryKeys.notifications.expenseListRoot() }),
      ])
    },
  })

  const markEventM = useMutation({
    mutationFn: (id: string) => markEventNotificationRead(token, id),
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: queryKeys.notifications.eventUnreadRoot() }),
        qc.invalidateQueries({ queryKey: queryKeys.notifications.eventListRoot() }),
      ])
    },
  })

  const markNewsM = useMutation({
    mutationFn: (id: string) => markNewsNotificationRead(token, id),
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: queryKeys.notifications.newsUnreadRoot() }),
        qc.invalidateQueries({ queryKey: queryKeys.notifications.newsListRoot() }),
      ])
    },
  })

  const markAllM = useMutation({
    mutationFn: () =>
      Promise.all([
        markAllStockNotificationsRead(token),
        markAllExpenseNotificationsRead(token),
        markAllEventNotificationsRead(token),
        markAllNewsNotificationsRead(token),
      ]),
    onSuccess: async () => {
      await Promise.all([
        qc.invalidateQueries({ queryKey: queryKeys.notifications.stockUnreadRoot() }),
        qc.invalidateQueries({ queryKey: queryKeys.notifications.stockListRoot() }),
        qc.invalidateQueries({ queryKey: queryKeys.notifications.expenseUnreadRoot() }),
        qc.invalidateQueries({ queryKey: queryKeys.notifications.expenseListRoot() }),
        qc.invalidateQueries({ queryKey: queryKeys.notifications.eventUnreadRoot() }),
        qc.invalidateQueries({ queryKey: queryKeys.notifications.eventListRoot() }),
        qc.invalidateQueries({ queryKey: queryKeys.notifications.newsUnreadRoot() }),
        qc.invalidateQueries({ queryKey: queryKeys.notifications.newsListRoot() }),
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
    const event: AppNotification[] = (eventListQ.data ?? []).map((n) => ({
      kind: 'event' as const,
      id: n.id,
      message: n.message,
      read_at: n.read_at,
      created_at: n.created_at,
      event_instance_id: n.event_instance_id,
    }))
    const news: AppNotification[] = (newsListQ.data ?? []).map((n) => ({
      kind: 'news' as const,
      id: n.id,
      message: n.message,
      read_at: n.read_at,
      created_at: n.created_at,
      news_id: n.news_id,
    }))
    return [...stock, ...expense, ...event, ...news].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    )
  }, [eventListQ.data, expenseListQ.data, stockListQ.data, newsListQ.data])

  function markOne(n: AppNotification) {
    if (n.read_at) return
    if (n.kind === 'stock') markStockM.mutate(n.id)
    else if (n.kind === 'expense') markExpenseM.mutate(n.id)
    else if (n.kind === 'event') markEventM.mutate(n.id)
    else markNewsM.mutate(n.id)
  }

  return {
    notifications,
    unread,
    isLoading:
      stockListQ.isLoading || expenseListQ.isLoading || eventListQ.isLoading || newsListQ.isLoading,
    isError: stockListQ.isError || expenseListQ.isError || eventListQ.isError || newsListQ.isError,
    refetch: () => {
      void stockListQ.refetch()
      void expenseListQ.refetch()
      void eventListQ.refetch()
      void newsListQ.refetch()
    },
    markOne,
    markAll: () => markAllM.mutate(),
    isMarkingAll: markAllM.isPending,
  }
}

export const NOTIFICATIONS_LIMIT = 10
