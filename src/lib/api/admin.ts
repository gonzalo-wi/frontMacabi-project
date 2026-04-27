import { apiRequest } from './apiClient'
import type {
  DailySummaryDTO,
  ListMealsDTO,
  MealDTO,
  CreateMealBody,
  MealTemplateDTO,
  ListMealTemplatesDTO,
  CreateMealTemplateBody,
  UpdateMealTemplateBody,
  PaginatedUsersDTO,
  UpdateUserRoleBody,
  UpdateUserStatusBody,
  UpdateUserBody,
  UserDTO,
} from './types'

/**
 * GET /api/admin/bookings/daily-summary?date=YYYY-MM-DD
 */
export async function getAdminDailySummary(
  token: string,
  date: string,
): Promise<DailySummaryDTO> {
  const q = new URLSearchParams({ date })
  return apiRequest<DailySummaryDTO>(`/api/admin/bookings/daily-summary?${q}`, {
    method: 'GET',
    token,
  })
}

/**
 * GET /api/meals?date=YYYY-MM-DD
 */
export async function getAdminMealsByDate(
  token: string,
  date: string,
): Promise<ListMealsDTO> {
  const q = new URLSearchParams({ date })
  return apiRequest<ListMealsDTO>(`/api/meals?${q}`, {
    method: 'GET',
    token,
  })
}

/**
 * POST /api/meals
 * Programa una vianda para una fecha usando un template.
 */
export async function createMeal(
  token: string,
  body: CreateMealBody,
): Promise<MealDTO> {
  return apiRequest<MealDTO>('/api/meals', {
    method: 'POST',
    token,
    body,
  })
}

/**
 * GET /api/meal-templates
 */
export async function getMealTemplates(
  token: string,
): Promise<ListMealTemplatesDTO> {
  return apiRequest<ListMealTemplatesDTO>('/api/meal-templates', {
    method: 'GET',
    token,
  })
}

/**
 * POST /api/meal-templates
 */
export async function createMealTemplate(
  token: string,
  body: CreateMealTemplateBody,
): Promise<MealTemplateDTO> {
  return apiRequest<MealTemplateDTO>('/api/meal-templates', {
    method: 'POST',
    token,
    body,
  })
}

/**
 * PUT /api/meal-templates/:id
 */
export async function updateMealTemplate(
  token: string,
  id: string,
  body: UpdateMealTemplateBody,
): Promise<MealTemplateDTO> {
  return apiRequest<MealTemplateDTO>(`/api/meal-templates/${id}`, {
    method: 'PUT',
    token,
    body,
  })
}

/**
 * DELETE /api/meal-templates/:id
 */
export async function deleteMealTemplate(
  token: string,
  id: string,
): Promise<void> {
  return apiRequest<void>(`/api/meal-templates/${id}`, {
    method: 'DELETE',
    token,
  })
}

/**
 * DELETE /api/meals/:id
 */
export async function deleteMeal(
  token: string,
  id: string,
): Promise<void> {
  return apiRequest<void>(`/api/meals/${id}`, {
    method: 'DELETE',
    token,
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
