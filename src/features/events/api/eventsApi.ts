import { apiRequest } from '@/lib/api/apiClient'
import type {
  AnswerInputDTO,
  EventDetailDTO,
  EventInstanceDTO,
  EventOptionDTO,
  EventParticipantResponsesDTO,
  MyResponseBodyDTO,
  PaginatedEventInstancesDTO,
} from '../model/types'

export type CreateEventBody = {
  title: string
  type?: string
  starts_at: string
  response_deadline_at?: string | null
  status?: string
}

export type PatchEventBody = {
  title: string
  type?: string
  starts_at: string
  response_deadline_at?: string | null
  status?: string
}

export type SetProjectsBody = {
  project_ids: string[]
}

export type CreateModuleBody = {
  event_instance_id: string
  title: string
  type: string
  sort_order?: number
  is_required?: boolean
}

export type PatchModuleBody = {
  title: string
  type: string
  sort_order?: number
  is_required?: boolean
}

export type CreateOptionGroupBody = {
  module_id: string
  name: string
  type: string
  sort_order?: number
  is_required?: boolean
}

export type PatchOptionGroupBody = {
  name: string
  type: string
  sort_order?: number
  is_required?: boolean
}

export type CreateOptionBody = {
  group_id: string
  label: string
  max_capacity?: number | null
  sort_order?: number
}

export type PatchOptionBody = {
  label: string
  max_capacity?: number | null
  sort_order?: number
  current_count?: number | null
}

export type EventModuleJson = {
  id: string
  event_instance_id: string
  title: string
  type: string
  sort_order: number
  is_required: boolean
  created_at: string
}

export type EventOptionGroupJson = {
  id: string
  module_id: string
  name: string
  type: string
  sort_order: number
  is_required: boolean
}

/**
 * Listado paginado global de instancias (participante y admin ven el mismo listado hasta que exista
 * algo tipo `GET /api/me/event-instances` por membresías).
 */
export function listEventInstances(
  token: string,
  page = 1,
  pageSize = 20,
): Promise<PaginatedEventInstancesDTO> {
  const q = new URLSearchParams({ page: String(page), page_size: String(pageSize) })
  return apiRequest<PaginatedEventInstancesDTO>(`/api/event-instances?${q}`, { token })
}

export function getEventDetail(token: string, id: string): Promise<EventDetailDTO> {
  return apiRequest<EventDetailDTO>(`/api/event-instances/${id}`, { token })
}

/** Admin: participantes que ya tienen respuesta guardada (con nombre y correo). */
export function listEventParticipantResponses(
  token: string,
  eventId: string,
): Promise<EventParticipantResponsesDTO> {
  return apiRequest<EventParticipantResponsesDTO>(
    `/api/event-instances/${eventId}/participant-responses`,
    {
      token,
    },
  )
}

export function createEventInstance(token: string, body: CreateEventBody): Promise<EventInstanceDTO> {
  return apiRequest<EventInstanceDTO>('/api/event-instances', { method: 'POST', token, body })
}

export function patchEventInstance(
  token: string,
  id: string,
  body: PatchEventBody,
): Promise<EventInstanceDTO> {
  return apiRequest<EventInstanceDTO>(`/api/event-instances/${id}`, { method: 'PATCH', token, body })
}

export function deleteEventInstance(token: string, id: string): Promise<void> {
  return apiRequest<void>(`/api/event-instances/${id}`, { method: 'DELETE', token })
}

export function setEventInstanceProjects(
  token: string,
  id: string,
  body: SetProjectsBody,
): Promise<void> {
  return apiRequest<void>(`/api/event-instances/${id}/projects`, { method: 'PUT', token, body })
}

export function createEventModule(token: string, body: CreateModuleBody): Promise<EventModuleJson> {
  return apiRequest<EventModuleJson>('/api/event-modules', { method: 'POST', token, body })
}

export function patchEventModule(
  token: string,
  id: string,
  body: PatchModuleBody,
): Promise<EventModuleJson> {
  return apiRequest<EventModuleJson>(`/api/event-modules/${id}`, { method: 'PATCH', token, body })
}

export function deleteEventModule(token: string, id: string): Promise<void> {
  return apiRequest<void>(`/api/event-modules/${id}`, { method: 'DELETE', token })
}

export function setEventModuleProjects(
  token: string,
  moduleId: string,
  body: SetProjectsBody,
): Promise<void> {
  return apiRequest<void>(`/api/event-modules/${moduleId}/projects`, { method: 'PUT', token, body })
}

export function createOptionGroup(
  token: string,
  body: CreateOptionGroupBody,
): Promise<EventOptionGroupJson> {
  return apiRequest<EventOptionGroupJson>('/api/event-option-groups', { method: 'POST', token, body })
}

export function patchOptionGroup(
  token: string,
  id: string,
  body: PatchOptionGroupBody,
): Promise<EventOptionGroupJson> {
  return apiRequest<EventOptionGroupJson>(`/api/event-option-groups/${id}`, {
    method: 'PATCH',
    token,
    body,
  })
}

export function deleteOptionGroup(token: string, id: string): Promise<void> {
  return apiRequest<void>(`/api/event-option-groups/${id}`, { method: 'DELETE', token })
}

export function createOption(token: string, body: CreateOptionBody): Promise<EventOptionDTO> {
  return apiRequest<EventOptionDTO>('/api/event-options', { method: 'POST', token, body })
}

export function patchOption(token: string, id: string, body: PatchOptionBody): Promise<EventOptionDTO> {
  return apiRequest<EventOptionDTO>(`/api/event-options/${id}`, { method: 'PATCH', token, body })
}

export function deleteOption(token: string, id: string): Promise<void> {
  return apiRequest<void>(`/api/event-options/${id}`, { method: 'DELETE', token })
}

export function getMyEventResponse(token: string, eventId: string): Promise<MyResponseBodyDTO> {
  return apiRequest<MyResponseBodyDTO>(`/api/event-instances/${eventId}/responses/me`, { token })
}

export function submitEventResponse(
  token: string,
  eventId: string,
  body: { project_id?: string | null; answers: AnswerInputDTO[] },
): Promise<void> {
  return apiRequest<void>(`/api/event-instances/${eventId}/responses`, {
    method: 'POST',
    token,
    body,
  })
}

export type DuplicateEventOverrides = {
  /** Si se omite o vacío, se usa "{título original} (copia)" */
  title?: string
  starts_at: string
  response_deadline_at: string | null
}

export async function duplicateEventFromDetail(
  token: string,
  sourceDetail: EventDetailDTO,
  overrides: DuplicateEventOverrides,
): Promise<{ newId: string }> {
  const inst = sourceDetail.instance
  const t = overrides.title?.trim()
  const created = await createEventInstance(token, {
    title: t || `${inst.title} (copia)`,
    type: inst.type,
    starts_at: overrides.starts_at,
    response_deadline_at: overrides.response_deadline_at,
    status: 'draft',
  })
  const newId = created.id

  await setEventInstanceProjects(token, newId, { project_ids: [...sourceDetail.project_ids] })

  const modules = [...sourceDetail.modules].sort(
    (a, b) => a.module.sort_order - b.module.sort_order,
  )
  for (const md of modules) {
    const m = await createEventModule(token, {
      event_instance_id: newId,
      title: md.module.title,
      type: md.module.type,
      sort_order: md.module.sort_order,
      is_required: md.module.is_required,
    })
    await setEventModuleProjects(token, m.id, { project_ids: [...md.project_ids] })
    const groups = [...md.option_groups].sort((a, b) => a.group.sort_order - b.group.sort_order)
    for (const gd of groups) {
      const g = await createOptionGroup(token, {
        module_id: m.id,
        name: gd.group.name,
        type: gd.group.type,
        sort_order: gd.group.sort_order,
        is_required: gd.group.is_required,
      })
      const opts = [...gd.options].sort((a, b) => a.sort_order - b.sort_order)
      for (const o of opts) {
        await createOption(token, {
          group_id: g.id,
          label: o.label,
          max_capacity: o.max_capacity,
          sort_order: o.sort_order,
        })
      }
    }
  }

  return { newId }
}
