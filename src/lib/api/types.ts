/** Alineado al backend: user/infrastructure/http/dto.go */

export type UserDTO = {
  id: string
  name: string
  email: string
  role: string
  created_at: string
}

export type LoginBody = {
  email: string
  password: string
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
 
/** POST /api/meals — body */
export type CreateMealBody = {
  title: string
  image_url: string
  description: string
  category: string
  type: string
  available_count: number
  date: string
}
