export type ResourceType = 'returnable' | 'consumable'

export type ResourceDTO = {
  id: string
  name: string
  type: ResourceType
  total_stock: number
  available_stock: number
  created_at: string
}

export type PaginatedResourcesDTO = {
  data: ResourceDTO[]
  total: number
  page: number
  page_size: number
  total_pages: number
}
