import { useMemo } from 'react'

import {
  greetingDateEsAR,
  greetingName,
  summaryLine,
} from '@/features/dashboard/lib/greeting'
import { useUserEventResponsesMap } from '@/features/events/hooks/useUserEventResponsesMap'
import { useUserRelevantUpcomingEvents } from '@/features/events/hooks/useUserRelevantUpcomingEvents'
import { useMyProjectMemberships } from '@/features/projects/hooks/useMyProjectMemberships'

type Args = {
  token: string | null
  userId: string | undefined
  userName: string | undefined
  isRestoring: boolean
}

export function usePanelPage({ token, userId, userName, isRestoring }: Args) {
  const membershipsQ = useMyProjectMemberships(token, userId, isRestoring)
  const upcomingQ = useUserRelevantUpcomingEvents(
    token,
    userId,
    membershipsQ.data,
    membershipsQ.isSuccess,
    isRestoring,
  )

  const eventIds = useMemo(
    () => upcomingQ.data?.events.map((e) => e.instance.id) ?? [],
    [upcomingQ.data],
  )
  const responseMap = useUserEventResponsesMap(token, eventIds, Boolean(token && upcomingQ.isSuccess))

  const upcomingCount = upcomingQ.data?.events.length ?? 0
  const membershipsCount = membershipsQ.data?.length ?? 0

  const resumen = useMemo(
    () =>
      summaryLine(
        membershipsQ.isPending,
        upcomingQ.isPending,
        membershipsCount,
        upcomingCount,
      ),
    [membershipsQ.isPending, upcomingQ.isPending, membershipsCount, upcomingCount],
  )

  const saludoNombre = userName ? greetingName(userName) : ''
  const fechaStr = greetingDateEsAR()

  return {
    membershipsQ,
    upcomingQ,
    responseMap,
    upcomingCount,
    membershipsCount,
    resumen,
    saludoNombre,
    fechaStr,
  }
}
