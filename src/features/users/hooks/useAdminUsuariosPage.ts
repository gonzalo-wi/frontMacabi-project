import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'

import { getUsers, listPendingInvitations } from '@/features/users/api/usersApi'
import { useAdminUserDrawer } from '@/features/users/hooks/useAdminUserDrawer'
import { useAdminUserMutations } from '@/features/users/hooks/useAdminUserMutations'
import { useUserProjectsByUser } from '@/features/users/hooks/useUserProjectsByUser'
import { mergeUsersWithOrphanInvitations } from '@/features/users/lib/userInvitationHelpers'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { PAGE_SIZE } from '@/lib/pagination'
import { queryKeys } from '@/lib/queryKeys'
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
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const debouncedQ = useDebouncedValue(search.trim())
  const resetKey = debouncedQ
  const [prevResetKey, setPrevResetKey] = useState(resetKey)
  if (resetKey !== prevResetKey) {
    setPrevResetKey(resetKey)
    setPage(1)
  }

  const usersQuery = useQuery({
    queryKey: queryKeys.users.adminList(token, page, debouncedQ),
    enabled: Boolean(token) && !isRestoring,
    queryFn: () => getUsers(token!, { page, pageSize: PAGE_SIZE, q: debouncedQ }),
    staleTime: 2 * 60_000,
  })

  const pendingInvitationsQuery = useQuery({
    queryKey: queryKeys.users.pendingInvitations(token),
    enabled: Boolean(token) && !isRestoring && !debouncedQ,
    queryFn: () => listPendingInvitations(token!),
    staleTime: 2 * 60_000,
  })

  const userProjectsQuery = useUserProjectsByUser(token, isRestoring)

  const {
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
  } = useAdminUserMutations(token, setSelected)

  const drawer = useAdminUserDrawer({ selected, setSelected, editMutation, pwMutation })

  function handleAddUser(e: React.FormEvent) {
    e.preventDefault()
    if (!inviteName.trim() || !inviteEmail.trim()) {
      toast.error('Nombre y email son obligatorios')
      return
    }
    const body = {
      name: inviteName.trim(),
      email: inviteEmail.trim().toLowerCase(),
      role: inviteRole,
    }
    createUserMutation.mutate(body, {
      onSuccess: () => {
        setInviteOpen(false)
        setInviteName('')
        setInviteEmail('')
        setInviteRole('user')
      },
    })
  }

  function handleAddAndInvite(e: React.FormEvent) {
    e.preventDefault()
    if (!inviteName.trim() || !inviteEmail.trim()) {
      toast.error('Nombre y email son obligatorios')
      return
    }
    const body = {
      name: inviteName.trim(),
      email: inviteEmail.trim().toLowerCase(),
      role: inviteRole,
    }
    inviteMutation.mutate(body, {
      onSuccess: () => {
        setInviteOpen(false)
        setInviteName('')
        setInviteEmail('')
        setInviteRole('user')
      },
    })
  }

  function closeInviteDialog(open: boolean) {
    setInviteOpen(open)
    if (!open) {
      setInviteName('')
      setInviteEmail('')
      setInviteRole('user')
      createUserMutation.reset()
      inviteMutation.reset()
    }
  }

  const totalUsers = usersQuery.data?.total ?? 0
  const totalPages = usersQuery.data?.total_pages ?? 1
  const pageRows = useMemo(() => {
    const users = usersQuery.data?.data ?? []
    if (debouncedQ) return users
    const invitations = pendingInvitationsQuery.data?.data ?? []
    return mergeUsersWithOrphanInvitations(users, invitations)
  }, [usersQuery.data?.data, pendingInvitationsQuery.data?.data, debouncedQ])

  const isOwnAccount = Boolean(selected && me && selected.id === me.id)

  const countLabel = useMemo(() => {
    if (usersQuery.isPending) return undefined
    if (search.trim()) {
      return `${totalUsers} resultado${totalUsers !== 1 ? 's' : ''} de búsqueda`
    }
    const orphanCount = debouncedQ
      ? 0
      : (pendingInvitationsQuery.data?.data ?? []).filter(
          (inv) => !(usersQuery.data?.data ?? []).some((u) => u.email.toLowerCase() === inv.email.toLowerCase()),
        ).length
    const total = totalUsers + orphanCount
    return `${total} usuario${total !== 1 ? 's' : ''} en total`
  }, [search, totalUsers, usersQuery.isPending, debouncedQ, pendingInvitationsQuery.data?.data, usersQuery.data?.data])

  const addDialogPending = createUserMutation.isPending || inviteMutation.isPending

  return {
    isAdmin,
    selected,
    setSelected,
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
    sendInviteMutation,
    resendInviteMutation,
    revokeInviteMutation,
    deleteUserMutation,
    drawer,
    search,
    setSearch,
    page,
    setPage,
    totalPages,
    pageRows,
    countLabel,
    handleAddUser,
    handleAddAndInvite,
    closeInviteDialog,
    totalUsers,
    isOwnAccount,
    userProjectsByUser: userProjectsQuery.data,
    addDialogPending,
    invalidateUsers,
    token,
  }
}
