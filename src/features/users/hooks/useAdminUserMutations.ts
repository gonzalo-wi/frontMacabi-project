import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import {
  createUser,
  createUserInvitation,
  deleteUser,
  resendInvitation,
  revokeInvitation,
  updateUser,
  updateUserRole,
  updateUserStatus,
} from '@/features/users/api/usersApi'
import { changePassword } from '@/lib/api/auth'
import { ApiError } from '@/lib/api/apiClient'
import type { UpdateUserRoleBody, UserDTO } from '@/lib/api/types'
import { queryKeys } from '@/lib/queryKeys'

type SetSelected = React.Dispatch<React.SetStateAction<UserDTO | null>>

function errorMessage(e: unknown, fallback: string) {
  return e instanceof ApiError ? e.message : e instanceof Error ? e.message : fallback
}

export function useAdminUserMutations(token: string | null, setSelected: SetSelected) {
  const queryClient = useQueryClient()

  const invalidateUsers = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.users.allRoot() })
    queryClient.invalidateQueries({ queryKey: queryKeys.users.adminListRoot() })
    queryClient.invalidateQueries({ queryKey: queryKeys.users.pendingInvitationsRoot() })
  }

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
      setSelected((prev) =>
        prev ? { ...prev, active: vars.active, invitation_status: vars.active ? 'active' : 'inactive' } : prev,
      )
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

  const createUserMutation = useMutation({
    mutationFn: (body: { name: string; email: string; role: 'user' | 'admin' }) =>
      createUser(token!, body),
    onSuccess: async () => {
      toast.success('Usuario agregado. Buscalo en la lista y desde su ficha podés enviarle la invitación cuando quieras.')
      await invalidateUsers()
    },
    onError: (e: unknown) => {
      toast.error(errorMessage(e, 'No se pudo agregar el usuario.'))
    },
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
      toast.error(errorMessage(e, 'No se pudo enviar la invitación.'))
    },
  })

  const sendInviteMutation = useMutation({
    mutationFn: (body: { name: string; email: string; role: 'user' | 'admin' }) =>
      createUserInvitation(token!, body),
    onSuccess: async (data) => {
      toast.success(data.message ?? 'Invitación enviada correctamente.')
      await invalidateUsers()
    },
    onError: (e: unknown) => {
      toast.error(errorMessage(e, 'No se pudo enviar la invitación.'))
    },
  })

  const resendInviteMutation = useMutation({
    mutationFn: (invitationId: string) => resendInvitation(token!, invitationId),
    onSuccess: async (data) => {
      toast.success(data.message ?? 'Invitación reenviada correctamente.')
      await invalidateUsers()
    },
    onError: (e: unknown) => {
      toast.error(errorMessage(e, 'No se pudo reenviar la invitación.'))
    },
  })

  const revokeInviteMutation = useMutation({
    mutationFn: (invitationId: string) => revokeInvitation(token!, invitationId),
    onSuccess: async (data) => {
      toast.success(data.message ?? 'Invitación cancelada.')
      await invalidateUsers()
    },
    onError: (e: unknown) => {
      toast.error(errorMessage(e, 'No se pudo cancelar la invitación.'))
    },
  })

  const deleteUserMutation = useMutation({
    mutationFn: (id: string) => deleteUser(token!, id),
    onSuccess: async (data) => {
      toast.success(data.message ?? 'Usuario eliminado correctamente.')
      await invalidateUsers()
      setSelected(null)
    },
    onError: (e: unknown) => {
      toast.error(errorMessage(e, 'No se pudo eliminar el usuario.'))
    },
  })

  return {
    roleMutation,
    statusMutation,
    editMutation,
    pwMutation,
    createUserMutation,
    inviteMutation,
    sendInviteMutation,
    resendInviteMutation,
    revokeInviteMutation,
    deleteUserMutation,
    invalidateUsers,
  }
}
