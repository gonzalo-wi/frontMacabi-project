import { queryKeys } from '@/lib/queryKeys'

type QueryRoot = readonly string[]

/** Query key roots to invalidate on pull-to-refresh, scoped by current route. */
export function getPullRefreshRoots(pathname: string): QueryRoot[] | null {
  const normalized = pathname.replace(/\/+$/, '') || '/'

  if (normalized === '/app') {
    return [
      queryKeys.memberships.myRoot(),
      queryKeys.events.userRelevantUpcomingRoot(),
      queryKeys.events.myResponseRoot(),
    ]
  }

  if (normalized.includes('/jornadas/') && normalized.includes('/responder')) {
    return [queryKeys.events.myResponseRoot(), queryKeys.events.detailRoot()]
  }

  if (normalized.startsWith('/app/gastos') || normalized.startsWith('/app/admin/gastos')) {
    return [
      queryKeys.expenses.myGlobalRoot(),
      queryKeys.expenses.detailRoot(),
      queryKeys.expenses.projectListRoot(),
      queryKeys.expenses.projectSummaryRoot(),
      queryKeys.expenses.projectBudgetRoot(),
      queryKeys.expenses.adminListRoot(),
      queryKeys.expenses.analyticsRoot(),
      queryKeys.notifications.expenseUnreadRoot(),
      queryKeys.notifications.expenseListRoot(),
    ]
  }

  if (normalized.startsWith('/app/stock') || normalized.startsWith('/app/admin/stock')) {
    return [
      queryKeys.stock.myRequestsGlobalRoot(),
      queryKeys.stock.requestDetailRoot(),
      queryKeys.stock.resourcesAllRoot(),
      queryKeys.stock.projectRequestsRoot(),
      queryKeys.stock.adminResourcesRoot(),
      queryKeys.stock.adminRequestsGlobalRoot(),
      queryKeys.notifications.stockUnreadRoot(),
      queryKeys.notifications.stockListRoot(),
    ]
  }

  if (normalized.startsWith('/app/admin/jornadas')) {
    return [
      queryKeys.events.adminListRoot(),
      queryKeys.events.detailRoot(),
      queryKeys.events.participantResponsesRoot(),
      queryKeys.events.moduleSummaryRoot(),
    ]
  }

  if (normalized.startsWith('/app/admin/proyectos')) {
    return [
      queryKeys.projects.adminListRoot(),
      queryKeys.projects.detailRoot(),
      queryKeys.projects.membersRoot(),
      queryKeys.projects.linkedEventsRoot(),
      queryKeys.expenses.projectListRoot(),
      queryKeys.expenses.projectSummaryRoot(),
      queryKeys.expenses.projectBudgetRoot(),
      queryKeys.stock.projectRequestsRoot(),
    ]
  }

  if (normalized.startsWith('/app/admin/usuarios')) {
    return [queryKeys.users.allRoot(), queryKeys.users.byUserProjectsRoot(), queryKeys.projects.allP1Root()]
  }

  if (normalized.startsWith('/app/admin')) {
    return null
  }

  return null
}
