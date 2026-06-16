import { apiRequest } from '@/lib/api/apiClient'
import { fetchAllPages } from '@/lib/api/fetchAllPages'
import type { PaginatedResourcesDTO, ResourceDTO, ResourceType } from '../model/types'

export type CreateResourceBody = {
  name: string
  type: ResourceType
  total_stock: number
}

export type UpdateResourceBody = {
  name: string
  type: ResourceType
  total_stock: number
}

export type ResourceListParams = {
  page?: number
  pageSize?: number
  q?: string
}

export function listResources(
  token: string,
  params: ResourceListParams = {},
): Promise<PaginatedResourcesDTO> {
  const { page = 1, pageSize = 50, q } = params
  const search = new URLSearchParams({ page: String(page), page_size: String(pageSize) })
  if (q?.trim()) search.set('q', q.trim())
  return apiRequest<PaginatedResourcesDTO>(`/api/stock/resources?${search}`, { token })
}

/** Todo el catálogo de recursos (recolecta páginas). */
export function fetchAllResources(token: string, maxPages = 50): Promise<ResourceDTO[]> {
  return fetchAllPages((page) => listResources(token, { page, pageSize: 50 }), maxPages)
}

export function getResource(token: string, id: string): Promise<ResourceDTO> {
  return apiRequest<ResourceDTO>(`/api/stock/resources/${id}`, { token })
}

export function createResource(token: string, body: CreateResourceBody): Promise<ResourceDTO> {
  return apiRequest<ResourceDTO>('/api/stock/resources', { method: 'POST', token, body })
}

export function updateResource(
  token: string,
  id: string,
  body: UpdateResourceBody,
): Promise<ResourceDTO> {
  return apiRequest<ResourceDTO>(`/api/stock/resources/${id}`, { method: 'PUT', token, body })
}

export function deleteResource(token: string, id: string): Promise<void> {
  return apiRequest<void>(`/api/stock/resources/${id}`, { method: 'DELETE', token })
}
