import { apiBaseUrl } from '@/config/env'

import type { ErrorResponseDTO } from './types'

export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

type RequestOptions = {
  method?: string
  body?: unknown
  token?: string | null
}

function joinApiUrl(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`
  return `${apiBaseUrl}${normalized}`
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, token } = options
  const url = joinApiUrl(path)

  const headers: Record<string, string> = {
    Accept: 'application/json',
  }

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  const res = await fetch(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  const text = await res.text()
  let json: unknown = null
  if (text) {
    try {
      json = JSON.parse(text) as unknown
    } catch {
      throw new ApiError(res.status, text || res.statusText)
    }
  }

  if (!res.ok) {
    const msg =
      json && typeof json === 'object' && json !== null && 'error' in json
        ? String((json as ErrorResponseDTO).error)
        : res.statusText || 'Error de red'
    throw new ApiError(res.status, msg)
  }

  return json as T
}

/** Multipart POST — no setear Content-Type (el browser arma el boundary). */
export async function apiMultipart<T>(path: string, formData: FormData, token: string): Promise<T> {
  const url = joinApiUrl(path)

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  })

  const text = await res.text()
  let json: unknown = null
  if (text) {
    try {
      json = JSON.parse(text) as unknown
    } catch {
      throw new ApiError(res.status, text || res.statusText)
    }
  }

  if (!res.ok) {
    const msg =
      json && typeof json === 'object' && json !== null && 'error' in json
        ? String((json as ErrorResponseDTO).error)
        : res.statusText || 'Error de red'
    throw new ApiError(res.status, msg)
  }

  return json as T
}
