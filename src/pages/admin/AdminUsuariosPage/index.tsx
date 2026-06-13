import { useEffect, useMemo, useState } from 'react'
import { Upload, UserPlus, Users } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { PageHeader } from '@/components/PageHeader'
import { ActionButton } from '@/components/ActionButton'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { DataToolbar } from '@/components/data/DataToolbar'
import { PaginationControls } from '@/components/data/PaginationControls'
import { Drawer, DrawerContent } from '@/components/ui/drawer'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { BulkInviteDialog } from '@/features/users/components/BulkInviteDialog'
import {
  createUserInvitation,
  updateUser,
  updateUserRole,
  updateUserStatus,
} from '@/features/users/api/usersApi'
import { fetchAllUsersForAdmin } from '@/features/projects/lib/projectAdminQueries'
import { fetchUserProjectsByUser } from '@/features/projects/lib/userProjectsIndex'
import { changePassword } from '@/lib/api/auth'
import { ApiError } from '@/lib/api/apiClient'
import type { UpdateUserRoleBody, UserDTO } from '@/lib/api/types'
import { PAGE_SIZE } from '@/lib/pagination'
import { useAuth } from '@/hooks/useAuth'
import { useIsDesktop } from '@/hooks/useIsMobile'

import { InviteDialog } from './InviteDialog'
import { UserDrawerContent } from './UserDrawerContent'
import { UsersTable } from './UsersTable'
import {
  compareUsers,
  defaultSortDir,
  SORT_MOBILE_VALUES,
  sortMobileLabel,
  type SortKey,
} from './userHelpers'

export default function AdminUsuariosPage() {
  const { token, user: me, isRestoring } = useAuth()
  const queryClient = useQueryClient()
  const isDesktop = useIsDesktop()
  const isAdmin = me?.role === 'admin'
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('created_at')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [confirmDeactivateOpen, setConfirmDeactivateOpen] = useState(false)
  const [selected, setSelected] = useState<UserDTO | null>(null)

  const [editName, setEditName] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editError, setEditError] = useState('')

  const [pwCurrent, setPwCurrent] = useState('')
  const [pwNew, setPwNew] = useState('')
  const [pwConfirm, setPwConfirm] = useState('')
  const [pwError, setPwError] = useState('')
  const [pwSuccess, setPwSuccess] = useState(false)

  const [inviteOpen, setInviteOpen] = useState(false)
  const [bulkOpen, setBulkOpen] = useState(false)
  const [inviteName, setInviteName] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'user' | 'admin'>('user')

  const usersQuery = useQuery({
    queryKey: ['admin-users-all', token],
    queryFn: () => fetchAllUsersForAdmin(token!),
    enabled: Boolean(token) && !isRestoring,
  })

  const userProjectsQuery = useQuery({
    queryKey: ['user-projects-by-user', token],
    queryFn: () => fetchUserProjectsByUser(token!),
    enabled: Boolean(token) && !isRestoring,
  })

  const userProjectsByUser = userProjectsQuery.data

  const roleMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: UpdateUserRoleBody['role'] }) =>
      updateUserRole(token!, id, { role }),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['admin-users-all'] })
      setSelected((prev) => prev ? { ...prev, role: vars.role } : prev)
    },
  })

  const statusMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      updateUserStatus(token!, id, { active }),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['admin-users-all'] })
      setSelected((prev) => prev ? { ...prev, active: vars.active } : prev)
    },
  })

  const editMutation = useMutation({
    mutationFn: ({ id, name, email }: { id: string; name: string; email: string }) =>
      updateUser(token!, id, { name, email }),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['admin-users-all'] })
      setSelected((prev) => prev ? { ...prev, name: vars.name, email: vars.email } : prev)
      setEditError('')
    },
    onError: () => setEditError('No se pudo guardar los cambios'),
  })

  const pwMutation = useMutation({
    mutationFn: ({ current_password, new_password }: { current_password: string; new_password: string }) =>
      changePassword(token!, { current_password, new_password }),
    onSuccess: () => {
      setPwCurrent('')
      setPwNew('')
      setPwConfirm('')
      setPwError('')
      setPwSuccess(true)
      setTimeout(() => setPwSuccess(false), 4000)
    },
    onError: () => setPwError('Contraseña actual incorrecta'),
  })

  const inviteMutation = useMutation({
    mutationFn: () =>
      createUserInvitation(token!, {
        name: inviteName.trim(),
        email: inviteEmail.trim().toLowerCase(),
        role: inviteRole,
      }),
    onSuccess: async (data) => {
      setInviteOpen(false)
      setInviteName('')
      setInviteEmail('')
      setInviteRole('user')
      toast.success(
        data.message ?? 'Invitación enviada: la persona recibirá un correo para crear su cuenta.',
      )
      await queryClient.invalidateQueries({ queryKey: ['admin-users-all'] })
    },
    onError: (e: unknown) => {
      const msg =
        e instanceof ApiError ? e.message : e instanceof Error ? e.message : 'No se pudo enviar la invitación.'
      toast.error(msg)
    },
  })

  function handleInviteSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!inviteName.trim() || !inviteEmail.trim()) {
      toast.error('Nombre y email son obligatorios')
      return
    }
    inviteMutation.mutate()
  }

  function openDrawer(u: UserDTO) {
    setSelected(u)
    setEditName(u.name)
    setEditEmail(u.email)
    setEditError('')
    setPwCurrent(''); setPwNew(''); setPwConfirm('')
    setPwError(''); setPwSuccess(false)
    editMutation.reset()
  }

  function closeDrawer() {
    setSelected(null)
    setConfirmDeactivateOpen(false)
  }

  function handleColumnSort(k: SortKey) {
    if (k === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(k)
      setSortDir(defaultSortDir(k))
    }
  }

  function handleMobileSortValue(v: string) {
    const [k, d] = v.split(':') as [SortKey, 'asc' | 'desc']
    setSortKey(k)
    setSortDir(d)
  }

  function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selected) return
    setEditError('')
    if (!editName.trim() || !editEmail.trim()) {
      setEditError('Nombre y email son obligatorios')
      return
    }
    editMutation.mutate({ id: selected.id, name: editName.trim(), email: editEmail.trim() })
  }

  function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault()
    setPwError('')
    if (!pwCurrent || !pwNew || !pwConfirm) {
      setPwError('Completá todos los campos')
      return
    }
    if (pwNew !== pwConfirm) {
      setPwError('Las contraseñas nuevas no coinciden')
      return
    }
    if (pwNew.length < 6) {
      setPwError('Mínimo 6 caracteres')
      return
    }
    pwMutation.mutate({ current_password: pwCurrent, new_password: pwNew })
  }

  const allUsers = useMemo(() => usersQuery.data ?? [], [usersQuery.data])

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => { setPage(1) }, [search, sortKey, sortDir])

  const filteredSorted = useMemo(() => {
    const q = search.trim().toLowerCase()
    let list = [...allUsers]
    if (q) {
      list = list.filter(
        (u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q),
      )
    }
    list.sort((a, b) => compareUsers(a, b, sortKey, sortDir))
    return list
  }, [allUsers, search, sortKey, sortDir])

  const filteredTotalPages = Math.max(1, Math.ceil(filteredSorted.length / PAGE_SIZE))

  useEffect(() => {
    const maxP = Math.max(1, Math.ceil(filteredSorted.length / PAGE_SIZE))
    setPage((p) => Math.min(p, maxP))
  }, [filteredSorted.length])
  /* eslint-enable react-hooks/set-state-in-effect */

  const safePage = Math.min(page, filteredTotalPages)

  const pageRows = useMemo(
    () => filteredSorted.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
    [filteredSorted, safePage],
  )

  const sortMobileValue = `${sortKey}:${sortDir}` as typeof SORT_MOBILE_VALUES[number]
  const totalUsers = allUsers.length
  const isOwnAccount = Boolean(selected && me && selected.id === me.id)

  return (
    <div className="min-h-screen">
      <PageHeader
        icon={Users}
        title="Usuarios"
        subtitle="Invitaciones, permisos y estado de cuenta."
        action={
          <div className="flex items-center gap-2">
            <ActionButton intent="secondary" onClick={() => setBulkOpen(true)}>
              <Upload className="w-4 h-4 mr-1" />
              Importar
            </ActionButton>
            <ActionButton intent="primary" onClick={() => setInviteOpen(true)}>
              <UserPlus className="w-4 h-4 mr-1" />
              Agregar usuario
            </ActionButton>
          </div>
        }
      />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-5">
        {usersQuery.isError && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            No se pudo cargar la lista de usuarios.
          </div>
        )}

        {!usersQuery.isError && (
          <>
            {!usersQuery.isPending && (
              <DataToolbar
                search={search}
                onSearch={setSearch}
                searchPlaceholder="Buscar por nombre o correo"
                countLabel={
                  search.trim()
                    ? `${filteredSorted.length} resultado${filteredSorted.length !== 1 ? 's' : ''} de ${totalUsers} usuario${totalUsers !== 1 ? 's' : ''}`
                    : `${totalUsers} usuario${totalUsers !== 1 ? 's' : ''} en total`
                }
                filters={
                  <div className="shrink-0 w-full sm:w-auto md:hidden">
                    <Select
                      value={SORT_MOBILE_VALUES.includes(sortMobileValue) ? sortMobileValue : 'created_at:desc'}
                      onValueChange={handleMobileSortValue}
                    >
                      <SelectTrigger className="h-10 w-full sm:min-w-[14rem]" aria-label="Ordenar usuarios">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SORT_MOBILE_VALUES.map((v) => (
                          <SelectItem key={v} value={v}>{sortMobileLabel(v)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                }
              />
            )}

            <UsersTable
              pageRows={pageRows}
              totalUsers={totalUsers}
              sortKey={sortKey}
              sortDir={sortDir}
              onColumnSort={handleColumnSort}
              isPending={usersQuery.isPending}
              onOpenDrawer={openDrawer}
            />

            {filteredTotalPages > 1 && pageRows.length > 0 && (
              <PaginationControls page={safePage} totalPages={filteredTotalPages} onPageChange={setPage} compact />
            )}
          </>
        )}
      </div>

      <Drawer
        open={Boolean(selected)}
        onOpenChange={(o) => !o && closeDrawer()}
        direction={isDesktop ? 'right' : 'bottom'}
      >
        <DrawerContent className="px-0 pb-0 flex flex-col">
          {selected && (
            <UserDrawerContent
              user={selected}
              isOwnAccount={isOwnAccount}
              isAdmin={isAdmin}
              projectsLoading={userProjectsQuery.isPending}
              projectLinks={userProjectsByUser?.[selected.id]}
              edit={{
                name: editName,
                email: editEmail,
                error: editError,
                pending: editMutation.isPending,
                success: editMutation.isSuccess,
                onName: setEditName,
                onEmail: setEditEmail,
                onSubmit: handleEditSubmit,
              }}
              password={{
                current: pwCurrent,
                next: pwNew,
                confirm: pwConfirm,
                error: pwError,
                success: pwSuccess,
                pending: pwMutation.isPending,
                onCurrent: setPwCurrent,
                onNext: setPwNew,
                onConfirm: setPwConfirm,
                onSubmit: handlePasswordSubmit,
              }}
              onClose={closeDrawer}
              onConfirmDeactivate={() => setConfirmDeactivateOpen(true)}
              onReactivate={() => statusMutation.mutate({ id: selected.id, active: true })}
              statusPending={statusMutation.isPending}
              onRoleChange={(role) => roleMutation.mutate({ id: selected.id, role })}
              rolePending={roleMutation.isPending}
            />
          )}
        </DrawerContent>
      </Drawer>

      <BulkInviteDialog
        open={bulkOpen}
        onOpenChange={setBulkOpen}
        token={token!}
        onDone={() => { queryClient.invalidateQueries({ queryKey: ['admin-users-all'] }) }}
      />

      <InviteDialog
        open={inviteOpen}
        onOpenChange={(open) => {
          setInviteOpen(open)
          if (!open) {
            setInviteName('')
            setInviteEmail('')
            setInviteRole('user')
            inviteMutation.reset()
          }
        }}
        name={inviteName}
        email={inviteEmail}
        role={inviteRole}
        onName={setInviteName}
        onEmail={setInviteEmail}
        onRole={setInviteRole}
        onSubmit={handleInviteSubmit}
        onCancel={() => setInviteOpen(false)}
        isPending={inviteMutation.isPending}
      />

      <ConfirmDialog
        open={confirmDeactivateOpen}
        onOpenChange={setConfirmDeactivateOpen}
        title="¿Desactivar esta cuenta?"
        description={
          selected ? (
            <>
              <span className="font-medium text-foreground">{selected.name}</span>
              {' — '}
              <span className="break-all">{selected.email}</span>
              {' '}no podrá iniciar sesión. Podés volver a activarla cuando quieras.
            </>
          ) : null
        }
        confirmLabel="Desactivar"
        loadingLabel="Desactivar"
        destructive
        loading={statusMutation.isPending}
        onConfirm={() => {
          if (!selected) return
          statusMutation.mutate({ id: selected.id, active: false })
          setConfirmDeactivateOpen(false)
        }}
      />
    </div>
  )
}
