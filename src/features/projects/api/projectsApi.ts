import { apiRequest } from '@/lib/api/apiClient'
import { fetchAllPages } from '@/lib/api/fetchAllPages'
import type {
  PaginatedProjectsDTO,
  ProjectDTO,
  ProjectMemberDTO,
  ProjectMembersListDTO,
} from '../model/types'

export type CreateProjectBody = {
  name: string
  description?: string
  coordinator_id: string
}

export type UpdateProjectBody = {
  name: string
  description?: string
}

export type AddMemberBody = {
  user_id: string
  role: string
}

export type ProjectListParams = {
  page?: number
  pageSize?: number
  q?: string
}

export function listProjects(
  token: string,
  params: ProjectListParams = {},
): Promise<PaginatedProjectsDTO> {
  const { page = 1, pageSize = 20, q } = params
  const search = new URLSearchParams({ page: String(page), page_size: String(pageSize) })
  if (q?.trim()) search.set('q', q.trim())
  return apiRequest<PaginatedProjectsDTO>(`/api/projects?${search}`, { token })
}

/** Todos los proyectos (recolecta páginas). */
export function fetchAllProjects(token: string, maxPages = 20): Promise<ProjectDTO[]> {
  return fetchAllPages((page) => listProjects(token, { page, pageSize: 50 }), maxPages)
}

export function getProject(token: string, id: string): Promise<ProjectDTO> {
  return apiRequest<ProjectDTO>(`/api/projects/${id}`, { token })
}

export function createProject(token: string, body: CreateProjectBody): Promise<ProjectDTO> {
  return apiRequest<ProjectDTO>('/api/projects', { method: 'POST', token, body })
}

export function updateProject(token: string, id: string, body: UpdateProjectBody): Promise<ProjectDTO> {
  return apiRequest<ProjectDTO>(`/api/projects/${id}`, { method: 'PUT', token, body })
}

export function deleteProject(token: string, id: string): Promise<void> {
  return apiRequest<void>(`/api/projects/${id}`, { method: 'DELETE', token })
}

export function listProjectMembers(token: string, projectId: string): Promise<ProjectMembersListDTO> {
  return apiRequest<ProjectMembersListDTO>(`/api/projects/${projectId}/members`, { token })
}

export function addProjectMember(
  token: string,
  projectId: string,
  body: AddMemberBody,
): Promise<ProjectMemberDTO> {
  return apiRequest<ProjectMemberDTO>(`/api/projects/${projectId}/members`, {
    method: 'POST',
    token,
    body,
  })
}

export function removeProjectMember(
  token: string,
  projectId: string,
  userId: string,
): Promise<void> {
  return apiRequest<void>(`/api/projects/${projectId}/members/${userId}`, {
    method: 'DELETE',
    token,
  })
}
