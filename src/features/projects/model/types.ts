export type ProjectDTO = {
  id: string
  name: string
  description: string
  coordinator_id?: string
  created_at: string
}

export type PaginatedProjectsDTO = {
  data: ProjectDTO[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

export type ProjectMemberDTO = {
  id: string
  project_id: string
  user_id: string
  role: string
  created_at: string
}

export type ProjectMembersListDTO = {
  data: ProjectMemberDTO[]
}
