/** Centralized TanStack Query keys for the frontend. */

export const queryKeys = {
  users: {
    allRoot: () => ['admin-users-all'] as const,
    all: (token: string | null | undefined) => ['admin-users-all', token] as const,
    adminListRoot: () => ['admin-users-list'] as const,
    adminList: (token: string | null | undefined, page: number, q: string) =>
      ['admin-users-list', token, page, q] as const,
    byUserProjectsRoot: () => ['user-projects-by-user'] as const,
    byUserProjects: (token: string | null | undefined) => ['user-projects-by-user', token] as const,
  },
  projects: {
    detailRoot: () => ['project'] as const,
    detail: (id: string | undefined, token: string | null | undefined) =>
      ['project', id, token] as const,
    adminListRoot: () => ['admin-projects-all'] as const,
    adminList: (token: string | null | undefined, page: number, q: string) =>
      ['admin-projects-all', token, page, q] as const,
    linkedEventsRoot: () => ['project-linked-events'] as const,
    linkedEvents: (projectId: string | undefined, token: string | null | undefined) =>
      ['project-linked-events', projectId, token] as const,
    membersRoot: () => ['project-members'] as const,
    members: (projectId: string | undefined, token: string | null | undefined) =>
      ['project-members', projectId, token] as const,
    membersRoster: (eventId: string, projectId: string, token: string | null | undefined) =>
      ['project-members-roster', eventId, projectId, token] as const,
    allMin: (token: string | null | undefined) => ['admin-projects-min', token] as const,
    allP1Root: () => ['projects-all-p1'] as const,
    allP1: (token: string | null | undefined) => ['projects-all-p1', token] as const,
    nameMap: (token: string | null | undefined) => ['project-name-map', token] as const,
  },
  expenses: {
    categoriesRoot: () => ['expense-categories'] as const,
    categories: (token: string | null | undefined) => ['expense-categories', token] as const,
    detailRoot: () => ['expense-detail'] as const,
    detail: (id: string | undefined, token: string | null | undefined) =>
      ['expense-detail', id, token] as const,
    myGlobalRoot: () => ['my-expenses-global'] as const,
    myGlobal: (token: string | null | undefined) => ['my-expenses-global', token] as const,
    projectListRoot: () => ['project-expenses'] as const,
    projectList: (projectId: string | undefined, token: string | null | undefined) =>
      ['project-expenses', projectId, token] as const,
    projectSummaryRoot: () => ['project-expense-summary'] as const,
    projectSummary: (
      projectId: string | undefined,
      token: string | null | undefined,
      desde: string,
      hasta: string,
    ) => ['project-expense-summary', projectId, token, desde, hasta] as const,
    projectBudgetRoot: () => ['project-budget'] as const,
    projectBudget: (projectId: string | undefined, token: string | null | undefined) =>
      ['project-budget', projectId, token] as const,
    adminListRoot: () => ['admin-expenses-list'] as const,
    adminList: (
      token: string | null | undefined,
      page: number,
      projectFilter: string,
      statusFilter: string,
      desde: string,
      hasta: string,
      query: string,
    ) => ['admin-expenses-list', token, page, projectFilter, statusFilter, desde, hasta, query] as const,
    analyticsRoot: () => ['expense-analytics'] as const,
    analytics: (token: string | null | undefined, desde: string, hasta: string) =>
      ['expense-analytics', token, desde, hasta] as const,
  },
  stock: {
    requestDetailRoot: () => ['stock-request-detail'] as const,
    requestDetail: (id: string | undefined, token: string | null | undefined) =>
      ['stock-request-detail', id, token] as const,
    resourcesAllRoot: () => ['stock-resources-all'] as const,
    resourcesAll: (token: string | null | undefined) => ['stock-resources-all', token] as const,
    myRequestsGlobalRoot: () => ['participant-my-stock-requests-global'] as const,
    myRequestsGlobal: (token: string | null | undefined) =>
      ['participant-my-stock-requests-global', token] as const,
    projectRequestsRoot: () => ['project-stock-requests'] as const,
    projectRequests: (projectId: string | undefined, token: string | null | undefined, page: number) =>
      ['project-stock-requests', projectId, token, page] as const,
    adminResourcesRoot: () => ['admin-stock-resources'] as const,
    adminResources: (token: string | null | undefined, page: number, q: string) =>
      ['admin-stock-resources', token, page, q] as const,
    adminRequestsGlobalRoot: () => ['admin-stock-requests-global'] as const,
    adminRequestsGlobal: (
      token: string | null | undefined,
      page: number,
      q: string,
      status: string,
    ) => ['admin-stock-requests-global', token, page, q, status] as const,
  },
  events: {
    detailRoot: () => ['event-detail'] as const,
    detail: (id: string | undefined, token: string | null | undefined) =>
      ['event-detail', id, token] as const,
    detailDup: (seedId: string | null | undefined) => ['admin-event-detail-dup', seedId] as const,
    adminListRoot: () => ['admin-events'] as const,
    adminList: (
      token: string | null | undefined,
      page: number,
      q: string,
      status: string,
    ) => ['admin-events', token, page, q, status] as const,
    participantResponsesRoot: () => ['event-participant-responses'] as const,
    participantResponses: (eventId: string | undefined, token: string | null | undefined) =>
      ['event-participant-responses', eventId, token] as const,
    moduleSummaryRoot: () => ['module-response-summary'] as const,
    moduleSummary: (moduleId: string, token: string | null | undefined) =>
      ['module-response-summary', moduleId, token] as const,
    myResponseRoot: () => ['event-my-response'] as const,
    myResponse: (eventId: string | undefined, token: string | null | undefined) =>
      ['event-my-response', eventId, token] as const,
    userRelevantUpcomingRoot: () => ['user-relevant-upcoming-events'] as const,
    userRelevantUpcoming: (
      userId: string | undefined | null,
      token: string | null | undefined,
      membershipsFingerprint: string,
    ) => ['user-relevant-upcoming-events', userId, token, membershipsFingerprint] as const,
  },
  memberships: {
    myRoot: () => ['my-project-memberships'] as const,
    my: (userId: string | undefined | null, token: string | null | undefined) =>
      ['my-project-memberships', userId, token] as const,
  },
  notifications: {
    stockUnreadRoot: () => ['stock-notifications-unread'] as const,
    stockUnread: (token: string | null | undefined) => ['stock-notifications-unread', token] as const,
    expenseUnreadRoot: () => ['expense-notifications-unread'] as const,
    expenseUnread: (token: string | null | undefined) => ['expense-notifications-unread', token] as const,
    eventUnreadRoot: () => ['event-notifications-unread'] as const,
    eventUnread: (token: string | null | undefined) => ['event-notifications-unread', token] as const,
    stockListRoot: () => ['stock-notifications-list'] as const,
    stockList: (token: string | null | undefined) => ['stock-notifications-list', token] as const,
    expenseListRoot: () => ['expense-notifications-list'] as const,
    expenseList: (token: string | null | undefined) => ['expense-notifications-list', token] as const,
    eventListRoot: () => ['event-notifications-list'] as const,
    eventList: (token: string | null | undefined) => ['event-notifications-list', token] as const,
  },
} as const
