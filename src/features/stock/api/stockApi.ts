import { apiRequest } from '@/lib/api/apiClient'
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

export function listResources(
  token: string,
  page = 1,
  pageSize = 50,
): Promise<PaginatedResourcesDTO> {
  const q = new URLSearchParams({ page: String(page), page_size: String(pageSize) })
  return apiRequest<PaginatedResourcesDTO>(`/api/stock/resources?${q}`, { token })
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
