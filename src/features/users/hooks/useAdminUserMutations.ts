import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import {
  createUserInvitation,
  updateUser,
  updateUserRole,
  updateUserStatus,
} from '@/features/users/api/usersApi'
import { changePassword } from '@/lib/api/auth'
import { ApiError } from '@/lib/api/apiClient'
import type { UpdateUserRoleBody, UserDTO } from '@/lib/api/types'
import { queryKeys } from '@/lib/queryKeys'

type SetSelected = React.Dispatch<React.SetStateAction<UserDTO | null>>

export function useAdminUserMutations(token: string | null, setSelected: SetSelected) {
  const queryClient = useQueryClient()

  const invalidateUsers = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.users.allRoot() })

  const roleMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: UpdateUserRoleBody['role'] }) =>
      updateUserRole(token!, id, { role }),
    onSuccess: (_, vars) => {
      invalidateUsers()
      setSelected((prev) => (prev ? { ...prev, role: vars.role } : prev))
    },
  })

  const statusMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      updateUserStatus(token!, id, { active }),
    onSuccess: (_, vars) => {
      invalidateUsers()
      setSelected((prev) => (prev ? { ...prev, active: vars.active } : prev))
    },
  })

  const editMutation = useMutation({
    mutationFn: ({ id, name, email }: { id: string; name: string; email: string }) =>
      updateUser(token!, id, { name, email }),
    onSuccess: (_, vars) => {
      invalidateUsers()
      setSelected((prev) => (prev ? { ...prev, name: vars.name, email: vars.email } : prev))
    },
  })

  const pwMutation = useMutation({
    mutationFn: ({ current_password, new_password }: { current_password: string; new_password: string }) =>
      changePassword(token!, { current_password, new_password }),
  })

  const inviteMutation = useMutation({
    mutationFn: (body: { name: string; email: string; role: 'user' | 'admin' }) =>
      createUserInvitation(token!, body),
    onSuccess: async (data) => {
      toast.success(
        data.message ?? 'Invitación enviada: la persona recibirá un correo para crear su cuenta.',
      )
      await invalidateUsers()
    },
    onError: (e: unknown) => {
      const msg =
        e instanceof ApiError ? e.message : e instanceof Error ? e.message : 'No se pudo enviar la invitación.'
      toast.error(msg)
    },
  })

  return { roleMutation, statusMutation, editMutation, pwMutation, inviteMutation, invalidateUsers }
}
