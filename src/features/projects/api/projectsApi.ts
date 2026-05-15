import { apiRequest } from '@/lib/api/apiClient'
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

export function listProjects(
  token: string,
  page = 1,
  pageSize = 20,
): Promise<PaginatedProjectsDTO> {
  const q = new URLSearchParams({ page: String(page), page_size: String(pageSize) })
  return apiRequest<PaginatedProjectsDTO>(`/api/projects?${q}`, { token })
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
