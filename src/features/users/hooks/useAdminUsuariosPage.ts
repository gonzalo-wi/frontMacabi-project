import { useMemo, useState } from 'react'
import { toast } from 'sonner'

import { useAdminUserDrawer } from '@/features/users/hooks/useAdminUserDrawer'
import { useAdminUserMutations } from '@/features/users/hooks/useAdminUserMutations'
import { useAdminUsers } from '@/features/users/hooks/useAdminUsers'
import { useUserProjectsByUser } from '@/features/users/hooks/useUserProjectsByUser'
import {
  compareUsers,
  defaultSortDir,
  SORT_MOBILE_VALUES,
  type SortKey,
} from '@/features/users/lib/userHelpers'
import { useClientSortableListPage } from '@/hooks/useClientSortableListPage'
import type { UserDTO } from '@/lib/api/types'

type Args = {
  token: string | null
  me: UserDTO | null | undefined
  isRestoring: boolean
}

export function useAdminUsuariosPage({ token, me, isRestoring }: Args) {
  const isAdmin = me?.role === 'admin'

  const [selected, setSelected] = useState<UserDTO | null>(null)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [bulkOpen, setBulkOpen] = useState(false)
  const [inviteName, setInviteName] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'user' | 'admin'>('user')

  const usersQuery = useAdminUsers(token, isRestoring)
  const userProjectsQuery = useUserProjectsByUser(token, isRestoring)

  const { roleMutation, statusMutation, editMutation, pwMutation, inviteMutation, invalidateUsers } =
    useAdminUserMutations(token, setSelected)

  const drawer = useAdminUserDrawer({ selected, setSelected, editMutation, pwMutation })

  const allUsers = useMemo(() => usersQuery.data ?? [], [usersQuery.data])

  const list = useClientSortableListPage({
    items: allUsers,
    initialSortKey: 'created_at' as SortKey,
    defaultSortDir,
    compare: compareUsers,
    matchSearch: (u, term) =>
      u.name.toLowerCase().includes(term) || u.email.toLowerCase().includes(term),
  })

  function handleInviteSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!inviteName.trim() || !inviteEmail.trim()) {
      toast.error('Nombre y email son obligatorios')
      return
    }
    inviteMutation.mutate(
      {
        name: inviteName.trim(),
        email: inviteEmail.trim().toLowerCase(),
        role: inviteRole,
      },
      {
        onSuccess: () => {
          setInviteOpen(false)
          setInviteName('')
          setInviteEmail('')
          setInviteRole('user')
        },
      },
    )
  }

  function closeInviteDialog(open: boolean) {
    setInviteOpen(open)
    if (!open) {
      setInviteName('')
      setInviteEmail('')
      setInviteRole('user')
      inviteMutation.reset()
    }
  }

  const sortMobileValue = `${list.sortKey}:${list.sortDir}` as (typeof SORT_MOBILE_VALUES)[number]
  const totalUsers = allUsers.length
  const isOwnAccount = Boolean(selected && me && selected.id === me.id)

  return {
    isAdmin,
    selected,
    inviteOpen,
    setInviteOpen,
    bulkOpen,
    setBulkOpen,
    inviteName,
    setInviteName,
    inviteEmail,
    setInviteEmail,
    inviteRole,
    setInviteRole,
    usersQuery,
    userProjectsQuery,
    roleMutation,
    statusMutation,
    drawer,
    list,
    handleInviteSubmit,
    closeInviteDialog,
    sortMobileValue,
    totalUsers,
    isOwnAccount,
    userProjectsByUser: userProjectsQuery.data,
    inviteMutation,
    invalidateUsers,
    token,
  }
}
