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

export type CreateUserInvitationBody = {
  email: string
  name: string
  role?: string
}

export type LoginResponseDTO = {
  token: string
  user: UserDTO
}

export type ErrorResponseDTO = {
  error: string
}

/** meal/infrastructure/http/dto.go */
export type MealDTO = {
  id: string
  title: string
  image_url: string
  description: string
  category: string
  type: string
  sold_out: boolean
  available_count: number
  date: string
  created_at: string
}

/** GET /api/meals?date= — meal/infrastructure/http/dto.go ListMealsResponse */
export type ListMealsDTO = {
  data: MealDTO[]
}

export type BookingDTO = {
  id: string
  meal_id: string
  meal?: MealDTO
  created_at: string
}

export type PaginatedBookingsDTO = {
  data: BookingDTO[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

/** GET /api/admin/bookings/daily-summary?date= */
export type DailySummaryPersona = {
  nombre: string
}
 
export type DailySummaryMenu = {
  menuId: string
  nombre: string
  cantidad: number
  personas: DailySummaryPersona[]
}
 
export type DailySummaryDTO = {
  fecha: string
  totalMenus: number
  porMenu: DailySummaryMenu[]
}
 
/** GET|POST /api/meal-templates */
export type MealTemplateDTO = {
  id: string
  title: string
  image_url: string
  description: string
  category: string
  type: string
  created_at: string
}

export type ListMealTemplatesDTO = {
  data: MealTemplateDTO[]
}

export type CreateMealTemplateBody = {
  title: string
  image_url: string
  description: string
  category: string
  type: string
}

/** PUT /api/meal-templates/:id — todos los campos son opcionales */
export type UpdateMealTemplateBody = Partial<CreateMealTemplateBody>

/** POST /api/meals — body (usa template_id) */
export type CreateMealBody = {
  template_id: string
  available_count: number
  date: string
}

/** GET /api/users */
export type PaginatedUsersDTO = {
  data: UserDTO[]
  total: number
  page: number
  page_size: number
  total_pages: number
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
  role: 'admin' | 'user' | 'super_admin'
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
