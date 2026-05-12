/** Alineado al backend: user/infrastructure/http/dto.go */

export type UserDTO = {
  id: string
  name: string
  email: string
  role: string
  active?: boolean
  created_at: string
}

export type LoginBody = {
  email: string
  password: string
}

export type AcceptInvitationBody = {
  token: string
  password: string
}

/** POST /api/users/invitations */
export type CreateUserInvitationBody = {
  name: string
  email: string
  role?: string
}

export type LoginResponseDTO = {
  token: string
  user: UserDTO
}

export type MessageResponseDTO = {
  message: string
}

export type ConfirmPasswordResetBody = {
  token: string
  new_password: string
}

export type ErrorResponseDTO = {
  error: string
}

/** GET /api/users */
export type PaginatedUsersDTO = {
  data: UserDTO[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

export type InviteUserCreatedResponseDTO = {
  message?: string
}

/** GET /api/users/invitations */
export type PendingInvitationDTO = {
  id: string
  email: string
  name: string
  role: string
  expires_at: string
  created_at: string
}

export type ListPendingInvitationsDTO = {
  data: PendingInvitationDTO[]
}

/** PATCH /api/users/:id/role */
export type UpdateUserRoleBody = {
  role: 'admin' | 'user'
}

/** PATCH /api/users/:id/status */
export type UpdateUserStatusBody = {
  active: boolean
}

/** PUT /api/users/:id */
export type UpdateUserBody = {
  name?: string
  email?: string
}

/** PATCH /api/me/password */
export type ChangePasswordBody = {
  current_password: string
  new_password: string
}
