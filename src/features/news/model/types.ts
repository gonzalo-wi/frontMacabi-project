export type NewsStatus = 'draft' | 'published'

export interface NewsDTO {
  id: string
  title: string
  body: string
  status: NewsStatus
  author_id: string
  /** URL firmada de la imagen (ausente si no hay imagen). */
  image_url?: string
  has_image: boolean
  /** Proyectos destino. Vacío = todos. */
  project_ids: string[]
  published_at: string | null
  created_at: string
  updated_at: string
}

export interface PaginatedNewsDTO {
  data: NewsDTO[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

export interface NewsNotificationDTO {
  id: string
  news_id: string
  message: string
  read_at: string | null
  created_at: string
}

export interface NewsUnreadCountDTO {
  unread_count: number
}
