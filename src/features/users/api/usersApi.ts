import { apiRequest } from '@/lib/api/apiClient'
import type {
  CreateUserBody,
  CreateUserInvitationBody,
  InviteUserCreatedResponseDTO,
  MessageResponseDTO,
  PaginatedUsersDTO,
  PendingInvitationsDTO,
  UpdateUserBody,
  UpdateUserRoleBody,
  UpdateUserStatusBody,
  UserDTO,
} from '@/lib/api/types'

export async function createUser(
  token: string,
  body: CreateUserBody,
): Promise<UserDTO> {
  return apiRequest<UserDTO>('/api/users', {
    method: 'POST',
    token,
    body,
  })
}

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

export async function deleteUser(token: string, id: string): Promise<MessageResponseDTO> {
  return apiRequest<MessageResponseDTO>(`/api/users/${id}`, {
    method: 'DELETE',
    token,
  })
}

export async function listPendingInvitations(token: string): Promise<PendingInvitationsDTO> {
  return apiRequest<PendingInvitationsDTO>('/api/users/invitations', {
    method: 'GET',
    token,
  })
}

export async function resendInvitation(
  token: string,
  invitationId: string,
): Promise<MessageResponseDTO> {
  return apiRequest<MessageResponseDTO>(`/api/users/invitations/${invitationId}/resend`, {
    method: 'POST',
    token,
  })
}

export async function revokeInvitation(
  token: string,
  invitationId: string,
): Promise<MessageResponseDTO> {
  return apiRequest<MessageResponseDTO>(`/api/users/invitations/${invitationId}`, {
    method: 'DELETE',
    token,
  })
}

export type UserListParams = {
  page?: number
  pageSize?: number
  q?: string
}

/**
 * GET /api/users?page=1&page_size=20&q=
 */
export async function getUsers(
  token: string,
  params: UserListParams = {},
): Promise<PaginatedUsersDTO> {
  const { page = 1, pageSize = 20, q } = params
  const search = new URLSearchParams({ page: String(page), page_size: String(pageSize) })
  if (q?.trim()) search.set('q', q.trim())
  return apiRequest<PaginatedUsersDTO>(`/api/users?${search}`, { method: 'GET', token })
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
export async function updateUser(token: string, id: string, body: UpdateUserBody): Promise<UserDTO> {
  return apiRequest<UserDTO>(`/api/users/${id}`, { method: 'PUT', token, body })
}
