import { apiRequest } from '@/lib/api/apiClient'
import type {
  PaginatedRequestsDTO,
  ResourceRequestDTO,
} from '../model/types'

export type CreateRequestBody = {
  project_id: string
  resource_id: string
  quantity: number
  withdrawal_date: string
  return_date?: string | null
  notes?: string
}

export function listProjectRequests(
  token: string,
  projectId: string,
  page = 1,
  pageSize = 50,
): Promise<PaginatedRequestsDTO> {
  const q = new URLSearchParams({
    page: String(page),
    page_size: String(pageSize),
    project_id: projectId,
  })
  return apiRequest<PaginatedRequestsDTO>(`/api/stock/requests?${q}`, { token })
}

export function getRequest(token: string, id: string): Promise<ResourceRequestDTO> {
  return apiRequest<ResourceRequestDTO>(`/api/stock/requests/${id}`, { token })
}

export function createRequest(
  token: string,
  body: CreateRequestBody,
): Promise<ResourceRequestDTO> {
  return apiRequest<ResourceRequestDTO>('/api/stock/requests', {
    method: 'POST',
    token,
    body,
  })
}

export function approveRequest(token: string, id: string): Promise<void> {
  return apiRequest<void>(`/api/stock/requests/${id}/approve`, { method: 'PATCH', token })
}

export function rejectRequest(token: string, id: string): Promise<void> {
  return apiRequest<void>(`/api/stock/requests/${id}/reject`, { method: 'PATCH', token })
}

export function deliverRequest(token: string, id: string): Promise<void> {
  return apiRequest<void>(`/api/stock/requests/${id}/deliver`, { method: 'PATCH', token })
}

export function returnRequest(token: string, id: string): Promise<void> {
  return apiRequest<void>(`/api/stock/requests/${id}/return`, { method: 'PATCH', token })
}
