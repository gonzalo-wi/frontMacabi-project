import { apiRequest } from './apiClient'
import type { ListMealsDTO } from './types'

export async function listMealsByDate(
  token: string,
  date: string,
  projectId?: string,
): Promise<ListMealsDTO> {
  const q = new URLSearchParams({ date })
  if (projectId) q.set('project_id', projectId)
  return apiRequest<ListMealsDTO>(`/api/meals?${q}`, { method: 'GET', token })
}
