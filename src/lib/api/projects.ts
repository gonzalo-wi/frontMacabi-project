import { apiRequest } from './apiClient'
import type {
  ProjectDTO,
  ListProjectsDTO,
  CreateProjectBody,
  UpdateProjectBody,
} from './types'

/**
 * GET /api/projects?page=1&page_size=10
 */
export async function listProjects(
  token: string,
  page = 1,
  pageSize = 10,
): Promise<ListProjectsDTO> {
  const q = new URLSearchParams({ page: String(page), page_size: String(pageSize) })
  return apiRequest<ListProjectsDTO>(`/api/projects?${q}`, { method: 'GET', token })
}

/**
 * GET /api/projects/:id
 */
export async function getProject(token: string, id: string): Promise<ProjectDTO> {
  return apiRequest<ProjectDTO>(`/api/projects/${encodeURIComponent(id)}`, {
    method: 'GET',
    token,
  })
}

/**
 * POST /api/projects  (super_admin)
 */
export async function createProject(
  token: string,
  body: CreateProjectBody,
): Promise<ProjectDTO> {
  return apiRequest<ProjectDTO>('/api/projects', { method: 'POST', token, body })
}

/**
 * PUT /api/projects/:id  (super_admin)
 */
export async function updateProject(
  token: string,
  id: string,
  body: UpdateProjectBody,
): Promise<ProjectDTO> {
  return apiRequest<ProjectDTO>(`/api/projects/${encodeURIComponent(id)}`, {
    method: 'PUT',
    token,
    body,
  })
}

/**
 * DELETE /api/projects/:id  (super_admin)
 */
export async function deleteProject(token: string, id: string): Promise<void> {
  return apiRequest<void>(`/api/projects/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    token,
  })
}
