import { apiRequest } from './apiClient'
import type { ListMealsDTO } from './types'

export async function listMealsByDate(token: string, date: string): Promise<ListMealsDTO> {
  const q = new URLSearchParams({ date })
  return apiRequest<ListMealsDTO>(`/api/meals?${q}`, { method: 'GET', token })
}
