import type { UserDTO } from '@/lib/api/types'

export type SortKey = 'name' | 'email' | 'created_at' | 'role' | 'status'

export function defaultSortDir(key: SortKey): 'asc' | 'desc' {
  if (key === 'created_at' || key === 'status') return 'desc'
  return 'asc'
}

export function getInitials(name: string): string {
  return name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
}

export function formatUserCreatedAt(iso: string | undefined): string {
  if (!iso) return '—'
  try {
    return new Intl.DateTimeFormat('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(new Date(iso))
  } catch {
    return '—'
  }
}

export function compareUsers(
  a: UserDTO,
  b: UserDTO,
  key: SortKey,
  dir: 'asc' | 'desc',
): number {
  let cmp = 0
  const activeA = a.active !== false ? 1 : 0
  const activeB = b.active !== false ? 1 : 0
  switch (key) {
    case 'name':
      cmp = a.name.localeCompare(b.name, 'es', { sensitivity: 'base' })
      break
    case 'email':
      cmp = a.email.localeCompare(b.email, 'es', { sensitivity: 'base' })
      break
    case 'created_at':
      cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      break
    case 'role':
      cmp = a.role.localeCompare(b.role, 'es')
      break
    case 'status':
      cmp = activeA - activeB
      break
  }
  return dir === 'desc' ? -cmp : cmp
}

export const SORT_MOBILE_VALUES: `${SortKey}:${'asc' | 'desc'}`[] = [
  'created_at:desc',
  'created_at:asc',
  'name:asc',
  'name:desc',
  'email:asc',
  'email:desc',
  'role:asc',
  'role:desc',
  'status:desc',
  'status:asc',
]

export function sortMobileLabel(v: `${SortKey}:${'asc' | 'desc'}`): string {
  const [key, dir] = v.split(':') as [SortKey, 'asc' | 'desc']
  const d = dir === 'asc' ? '↑' : '↓'
  switch (key) {
    case 'created_at':
      return `Fecha alta ${d}`
    case 'name':
      return `Nombre ${d}`
    case 'email':
      return `Correo ${d}`
    case 'role':
      return `Rol ${d}`
    case 'status':
      return dir === 'desc' ? 'Estado (activos primero)' : 'Estado (inactivos primero)'
  }
}
