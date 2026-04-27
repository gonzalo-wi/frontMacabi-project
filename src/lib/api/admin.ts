import { apiRequest } from './apiClient'
import type { DailySummaryDTO, ListMealsDTO, MealDTO, CreateMealBody } from './types'

/**
 * GET /api/admin/bookings/daily-summary?date=YYYY-MM-DD
 * Requiere rol admin o superadmin.
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
 * Trae los menús disponibles para una fecha.
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
 * Crea un nuevo menú. Requiere rol admin o superadmin.
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
