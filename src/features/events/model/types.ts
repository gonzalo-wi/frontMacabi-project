/** Tipos alineados a eventos/jornadas (backend event HTTP). */

export type EventInstanceDTO = {
  id: string
  title: string
  type: string
  starts_at: string
  response_deadline_at?: string | null
  status: string
  created_at: string
}

export type PaginatedEventInstancesDTO = {
  data: EventInstanceDTO[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

export type EventOptionDTO = {
  id: string
  group_id: string
  label: string
  max_capacity: number | null
  current_count: number
  sort_order: number
}

export type EventOptionGroupDTO = {
  id: string
  module_id: string
  name: string
  type: string
  sort_order: number
  is_required: boolean
}

export type GroupDetailDTO = {
  group: EventOptionGroupDTO
  options: EventOptionDTO[]
}

export type EventModuleDTO = {
  id: string
  event_instance_id: string
  title: string
  type: string
  sort_order: number
  is_required: boolean
  created_at: string
}

export type ModuleDetailDTO = {
  module: EventModuleDTO
  project_ids: string[]
  option_groups: GroupDetailDTO[]
}

export type EventDetailDTO = {
  instance: EventInstanceDTO
  project_ids: string[]
  modules: ModuleDetailDTO[]
}

export type AnswerInputDTO = {
  group_id: string
  option_id?: string | null
  text_value?: string | null
}

export type MyResponseBodyDTO = {
  response: {
    id: string
    event_instance_id: string
    user_id: string
    project_id?: string
    created_at: string
  } | null
  answers: Array<{
    id: string
    response_id: string
    group_id?: string
    option_id?: string
    text_value?: string
  }>
}

/** GET /api/event-instances/:id/participant-responses (admin) — una fila por persona que ya respondió. */
export type EventParticipantAnswerDTO = {
  id: string
  response_id: string
  group_id?: string
  option_id?: string
  text_value?: string
}

export type EventParticipantResponseDTO = {
  response: {
    id: string
    event_instance_id: string
    user_id: string
    user_name: string
    user_email: string
    project_id?: string | null
    created_at: string
  }
  answers: EventParticipantAnswerDTO[]
}

export type EventParticipantResponsesDTO = {
  data: EventParticipantResponseDTO[]
}

// ── GET /api/event-modules/:id/response-summary ──────────────────────────────

export type ModuleResponseSummaryUserDTO = {
  user_id: string
  user_name: string
  user_email: string
  project_id?: string | null
}

export type ModuleResponseSummaryOptionDTO = {
  id?: string
  label: string
  count: number
  users: ModuleResponseSummaryUserDTO[]
}

export type ModuleResponseSummaryTextAnswerDTO = {
  value: string
  user: ModuleResponseSummaryUserDTO
}

export type ModuleResponseSummaryGroupDTO = {
  id?: string
  name: string
  type: string
  options: ModuleResponseSummaryOptionDTO[]
  text_answers: ModuleResponseSummaryTextAnswerDTO[]
}

export type ModuleResponseSummaryDTO = {
  module: {
    id: string
    title: string
    type: string
  }
  groups: ModuleResponseSummaryGroupDTO[]
}
