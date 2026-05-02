import { apiRequest } from './apiClient'
import type { BookingDTO, PaginatedBookingsDTO } from './types'

export async function listMyBookings(
  token: string,
  page = 1,
  pageSize = 50,
): Promise<PaginatedBookingsDTO> {
  const q = new URLSearchParams({
    page: String(page),
    page_size: String(pageSize),
  })
  return apiRequest<PaginatedBookingsDTO>(`/api/bookings/mine?${q}`, { method: 'GET', token })
}

export async function bookMeal(
  token: string,
  mealId: string,
  garnishOptionId?: string,
): Promise<BookingDTO> {
  const body: { meal_id: string; garnish_option_id?: string } = { meal_id: mealId }
  if (garnishOptionId) body.garnish_option_id = garnishOptionId
  return apiRequest<BookingDTO>('/api/bookings', {
    method: 'POST',
    body,
    token,
  })
}

export async function cancelBooking(token: string, bookingId: string): Promise<{ message: string }> {
  return apiRequest<{ message: string }>(`/api/bookings/${encodeURIComponent(bookingId)}`, {
    method: 'DELETE',
    token,
  })
}
