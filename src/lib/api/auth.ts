import { apiRequest } from './apiClient'
import type { LoginBody, LoginResponseDTO, RegisterBody, UserDTO, ChangePasswordBody } from './types'

export async function login(body: LoginBody): Promise<LoginResponseDTO> {
  return apiRequest<LoginResponseDTO>('/auth/login', {
    method: 'POST',
    body,
  })
}

export async function register(body: RegisterBody): Promise<void> {
  return apiRequest<void>('/auth/register', {
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
