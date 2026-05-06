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

/** projects/infrastructure/http/dto.go */
export type ProjectDTO = {
  id: string
  name: string
  description: string
  admin_user_id: string
  capacity: number
  active: boolean
  created_at: string
}

export type ListProjectsDTO = {
  data: ProjectDTO[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

export type CreateProjectBody = {
  name: string
  description: string
  admin_user_id: string
}

export type UpdateProjectBody = Partial<CreateProjectBody>

/** meal/infrastructure/http/dto.go */
export type GarnishOptionDTO = {
  id: string
  name: string
}

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
  project_id: string
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
  garnish_option_id?: string
  garnish_option?: GarnishOptionDTO
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
export type DailySummaryMenu = {
  meal_id: string
  title: string
  quantity: number
  persons: string[]
}

export type DailySummaryProject = {
  project_id: string
  project_name: string
  total_menus: number
  meal_summaries: DailySummaryMenu[]
}

export type DailySummaryDTO = {
  date: string
  total_menus: number
  projects: DailySummaryProject[]
}
 
/** GET|POST /api/meal-templates */
export type MealTemplateDTO = {
  id: string
  title: string
  image_url: string
  description: string
  category: string
  type: string
  garnish_options: GarnishOptionDTO[]
  created_at: string
}

/** POST /api/meal-templates/:id/garnish-options */
export type AddGarnishOptionBody = {
  name: string
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
  project_id: string
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

/** GET /api/projects/:id/attendance */
export type AttendanceCountDTO = {
  project_id: string
  confirmed: number
}

/** POST /api/projects/:id/attendance */
export type AttendanceDTO = {
  id: string
  user_id: string
  project_id: string
}
