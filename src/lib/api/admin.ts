import { apiRequest } from './apiClient'
import type {
  PaginatedUsersDTO,
  UpdateUserRoleBody,
  UpdateUserStatusBody,
  UpdateUserBody,
  UserDTO,
  CreateUserInvitationBody,
  InviteUserCreatedResponseDTO,
} from './types'

export async function createUserInvitation(
  token: string,
  body: CreateUserInvitationBody,
): Promise<InviteUserCreatedResponseDTO> {
  return apiRequest<InviteUserCreatedResponseDTO>('/api/users/invitations', {
    method: 'POST',
    token,
    body,
  })
}

/**
 * GET /api/users?page=1&page_size=20
 */
export async function getUsers(
  token: string,
  page = 1,
  pageSize = 20,
): Promise<PaginatedUsersDTO> {
  const q = new URLSearchParams({ page: String(page), page_size: String(pageSize) })
  return apiRequest<PaginatedUsersDTO>(`/api/users?${q}`, { method: 'GET', token })
}

/**
 * PATCH /api/users/:id/role
 */
export async function updateUserRole(
  token: string,
  id: string,
  body: UpdateUserRoleBody,
): Promise<UserDTO> {
  return apiRequest<UserDTO>(`/api/users/${id}/role`, { method: 'PATCH', token, body })
}

/**
 * PATCH /api/users/:id/status
 */
export async function updateUserStatus(
  token: string,
  id: string,
  body: UpdateUserStatusBody,
): Promise<UserDTO> {
  return apiRequest<UserDTO>(`/api/users/${id}/status`, { method: 'PATCH', token, body })
}

/**
 * PUT /api/users/:id
 */
export async function updateUser(
  token: string,
  id: string,
  body: UpdateUserBody,
): Promise<UserDTO> {
  return apiRequest<UserDTO>(`/api/users/${id}`, { method: 'PUT', token, body })
}
