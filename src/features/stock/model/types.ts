export type ResourceType = 'returnable' | 'consumable'

export type ResourceDTO = {
  id: string
  name: string
  type: ResourceType
  total_stock: number
  available_stock: number
  created_at: string
}

export type PaginatedResourcesDTO = {
  data: ResourceDTO[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

// ── Resource Requests ────────────────────────────────────────

export type RequestStatus =
  | 'PENDIENTE'
  | 'RESERVADO'
  | 'ENTREGADO'
  | 'DEVUELTO'
  | 'RECHAZADO'

export type ResourceRequestDTO = {
  id: string
  project_id: string
  project_name: string
  resource_id: string
  resource_name: string
  resource_type: ResourceType
  requested_by_id: string
  requester_name: string
  quantity: number
  withdrawal_date: string
  return_date: string | null
  status: RequestStatus
  notes: string
  created_at: string
}

export type PaginatedRequestsDTO = {
  data: ResourceRequestDTO[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

// ── Notifications ────────────────────────────────────────────

export type StockNotificationDTO = {
  id: string
  request_id: string
  message: string
  read_at: string | null
  created_at: string
}

export type UnreadCountDTO = {
  unread_count: number
}
