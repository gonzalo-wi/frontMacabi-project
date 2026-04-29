import { apiRequest } from './apiClient'
import type { LoginBody, LoginResponseDTO, UserDTO, ChangePasswordBody, AcceptInvitationBody } from './types'

export async function login(body: LoginBody): Promise<LoginResponseDTO> {
  return apiRequest<LoginResponseDTO>('/auth/login', {
    method: 'POST',
    body,
  })
}

export async function acceptInvitation(body: AcceptInvitationBody): Promise<{ message: string }> {
  return apiRequest<{ message: string }>('/auth/accept-invitation', {
    method: 'POST',
    body,
  })
}

export async function getMe(token: string): Promise<UserDTO> {
  return apiRequest<UserDTO>('/api/me', { method: 'GET', token })
}

export async function changePassword(token: string, body: ChangePasswordBody): Promise<void> {
  return apiRequest<void>('/api/me/password', { method: 'PATCH', token, body })
}
