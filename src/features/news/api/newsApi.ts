import { apiMultipart, apiRequest } from '@/lib/api/apiClient'
import type { NewsDTO, PaginatedNewsDTO } from '../model/types'

export const NEWS_IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp'
export const NEWS_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const
export const NEWS_IMAGE_MAX_BYTES = 2 * 1024 * 1024

export function validateNewsImage(file: File): string | null {
  if (!NEWS_IMAGE_MIME_TYPES.includes(file.type as (typeof NEWS_IMAGE_MIME_TYPES)[number])) {
    return 'La imagen debe ser JPG, PNG o WebP.'
  }
  if (file.size > NEWS_IMAGE_MAX_BYTES) {
    return 'La imagen no puede superar 2 MB.'
  }
  return null
}

export type CreateNewsBody = {
  title: string
  body: string
  publish: boolean
  project_ids?: string[]
}

export type PatchNewsBody = {
  title?: string
  body?: string
  publish?: boolean
  renotify?: boolean
  project_ids?: string[]
}

/** Feed de noticias publicadas (todos los autenticados). */
export function listPublishedNews(token: string, page = 1, pageSize = 20): Promise<PaginatedNewsDTO> {
  const q = new URLSearchParams({ page: String(page), page_size: String(pageSize) })
  return apiRequest<PaginatedNewsDTO>(`/api/news?${q}`, { token })
}

/** Lista completa, incluye borradores (admin). */
export function listAllNews(token: string, page = 1, pageSize = 20): Promise<PaginatedNewsDTO> {
  const q = new URLSearchParams({ page: String(page), page_size: String(pageSize) })
  return apiRequest<PaginatedNewsDTO>(`/api/news/all?${q}`, { token })
}

/** Última noticia publicada (para el Panel). Devuelve null si no hay ninguna. */
export function getLatestNews(token: string): Promise<NewsDTO | null> {
  return apiRequest<NewsDTO | null>('/api/news/latest', { token })
}

export function getNews(token: string, id: string): Promise<NewsDTO> {
  return apiRequest<NewsDTO>(`/api/news/${id}`, { token })
}

export function createNews(
  token: string,
  body: CreateNewsBody,
  imageFile?: File | null,
): Promise<NewsDTO> {
  if (imageFile) {
    const fd = new FormData()
    fd.append('title', body.title)
    fd.append('body', body.body)
    fd.append('publish', String(body.publish))
    ;(body.project_ids ?? []).forEach((id) => fd.append('project_ids', id))
    fd.append('file', imageFile)
    return apiMultipart<NewsDTO>('/api/news', fd, token)
  }
  return apiRequest<NewsDTO>('/api/news', { method: 'POST', token, body })
}

export function patchNews(token: string, id: string, body: PatchNewsBody): Promise<NewsDTO> {
  return apiRequest<NewsDTO>(`/api/news/${id}`, { method: 'PATCH', token, body })
}

export function deleteNews(token: string, id: string): Promise<void> {
  return apiRequest<void>(`/api/news/${id}`, { method: 'DELETE', token })
}

/** Sube la imagen vía API (evita CORS con Supabase desde el navegador). */
export function uploadNewsImage(token: string, id: string, file: File): Promise<{ path: string }> {
  const fd = new FormData()
  fd.append('file', file)
  return apiMultipart<{ path: string }>(`/api/news/${id}/image`, fd, token)
}

export function removeNewsImage(token: string, id: string): Promise<void> {
  return apiRequest<void>(`/api/news/${id}/image`, { method: 'DELETE', token })
}
