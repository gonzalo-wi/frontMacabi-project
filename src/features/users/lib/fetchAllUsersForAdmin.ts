import { getUsers } from '@/features/users/api/usersApi'
import { fetchAllPages } from '@/lib/api/fetchAllPages'
import type { UserDTO } from '@/lib/api/types'

export function fetchAllUsersForAdmin(token: string): Promise<UserDTO[]> {
  return fetchAllPages((page) => getUsers(token, { page, pageSize: 100 }), 30)
}
