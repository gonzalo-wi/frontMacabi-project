import { apiRequest } from './apiClient'
import type { AttendanceDTO, AttendanceCountDTO } from './types'

/**
 * POST /api/projects/:id/attendance
 */
export async function confirmAttendance(
  token: string,
  projectId: string,
): Promise<AttendanceDTO> {
  return apiRequest<AttendanceDTO>(`/api/projects/${encodeURIComponent(projectId)}/attendance`, {
    method: 'POST',
    token,
  })
}

/**
 * GET /api/projects/:id/attendance
 */
export async function getAttendanceCount(
  token: string,
  projectId: string,
): Promise<AttendanceCountDTO> {
  return apiRequest<AttendanceCountDTO>(`/api/projects/${encodeURIComponent(projectId)}/attendance`, {
    method: 'GET',
    token,
  })
}