import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Users, ShieldCheck, User,
  ChevronRight, Loader2, X,
  CheckCircle2, XCircle,
  KeyRound, UserPlus, FolderKanban,
  ArrowUpDown, ArrowUp, ArrowDown, Calendar, Upload,
} from 'lucide-react'

import { PageHeader } from '@/components/PageHeader'
import { ActionButton } from '@/components/ActionButton'
import { DataToolbar } from '@/components/admin/DataToolbar'
import { PaginationControls } from '@/components/admin/PaginationControls'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { PasswordInput } from '@/components/PasswordInput'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Drawer, DrawerContent } from '@/components/ui/drawer'
import { FeedbackBanner } from '@/components/FeedbackBanner'
import { useAuth } from '@/hooks/useAuth'
import { useIsDesktop } from '@/hooks/useIsMobile'
import { updateUserRole, updateUserStatus, updateUser, createUserInvitation } from '@/features/users/api/usersApi'
import { BulkInviteDialog } from '@/features/users/components/BulkInviteDialog'
import { changePassword } from '@/lib/api/auth'
import type { UserDTO, UpdateUserRoleBody } from '@/lib/api/types'
import { ApiError } from '@/lib/api/apiClient'
import { cn } from '@/lib/utils'
import { labelProjectRole } from '@/features/events/lib/eventLabels'
import { fetchAllUsersForAdmin } from '@/features/projects/lib/projectAdminQueries'
import {
  fetchUserProjectsByUser,
  type UserProjectLink,
} from '@/features/projects/lib/userProjectsIndex'

const PAGE_SIZE = 10

const ROLE_META: Record<string, {
  label: string
  icon: React.ElementType
  classes: string
}> = {
  admin: { label: 'Admin',   icon: ShieldCheck, classes: 'bg-blue-50 text-blue-700 border-blue-200' },
  user:  { label: 'Usuario', icon: User,         classes: 'bg-slate-100 text-slate-600 border-slate-200' },
}

function RoleBadge({ role }: { role: string }) {
  const meta = ROLE_META[role] ?? { label: role, classes: 'bg-slate-100 text-slate-600 border-slate-200', icon: User }
  const Icon = meta.icon
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${meta.classes}`}>
      <Icon className="w-3 h-3" />
      {meta.label}
    </span>
  )
}

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border',
      active
        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
        : 'bg-slate-100 text-slate-500 border-slate-200',
    )}>
      {active
        ? <><CheckCircle2 className="w-3 h-3" />Activo</>
        : <><XCircle className="w-3 h-3" />Inactivo</>
      }
    </span>
  )
}

function getInitials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
}

function PasswordField({
  id, label, value, onChange, placeholder,
}: {
  id: string; label: string; value: string
  onChange: (v: string) => void; placeholder?: string
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <PasswordInput
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? '••••••••'}
        className="h-11"
      />
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
      {children}
    </p>
  )
}

function SkeletonRows({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="h-[68px] rounded-xl bg-muted/40 animate-pulse"
          style={{ opacity: 1 - i * 0.18 }}
        />
      ))}
    </div>
  )
}

type SortKey = 'name' | 'email' | 'created_at' | 'role' | 'status'

function defaultSortDir(key: SortKey): 'asc' | 'desc' {
  if (key === 'created_at' || key === 'status') return 'desc'
  return 'asc'
}

function formatUserCreatedAt(iso: string | undefined): string {
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

function compareUsers(
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

function SortCol({
  label,
  colKey,
  sortKey,
  sortDir,
  onSort,
  className,
}: {
  label: string
  colKey: SortKey
  sortKey: SortKey
  sortDir: 'asc' | 'desc'
  onSort: (k: SortKey) => void
  className?: string
}) {
  const active = sortKey === colKey
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        onSort(colKey)
      }}
      className={cn(
        'inline-flex items-center gap-1 rounded-md px-1 py-0.5 -mx-1 text-left uppercase tracking-wider',
        'text-[11px] font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors',
        className,
      )}
    >
      {label}
      {active ? (
        sortDir === 'asc' ? (
          <ArrowUp className="w-3 h-3 shrink-0" aria-hidden />
        ) : (
          <ArrowDown className="w-3 h-3 shrink-0" aria-hidden />
        )
      ) : (
        <ArrowUpDown className="w-3 h-3 shrink-0 opacity-35" aria-hidden />
      )}
    </button>
  )
}

const SORT_MOBILE_VALUES: `${SortKey}:${'asc' | 'desc'}`[] = [
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

function sortMobileLabel(v: `${SortKey}:${'asc' | 'desc'}`): string {
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
    default:
      return v
  }
}

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

  const [editName, setEditName]   = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editError, setEditError] = useState('')

  const [pwCurrent,  setPwCurrent]  = useState('')
  const [pwNew,      setPwNew]      = useState('')
  const [pwConfirm,  setPwConfirm]  = useState('')
  const [pwError,    setPwError]    = useState('')
  const [pwSuccess,  setPwSuccess]  = useState(false)

  const [inviteOpen, setInviteOpen] = useState(false)
  const [bulkOpen, setBulkOpen] = useState(false)
  const [inviteName, setInviteName] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'user' | 'admin'>('user')
  const [inviteBanner, setInviteBanner] = useState<{
    text: string
    variant: 'success' | 'error' | 'info'
  } | null>(null)

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
      setInviteBanner({
        text: data.message ?? 'Invitación enviada: la persona recibirá un correo para crear su cuenta.',
        variant: 'success',
      })
      await queryClient.invalidateQueries({ queryKey: ['admin-users-all'] })
    },
    onError: (e: unknown) => {
      const msg =
        e instanceof ApiError ? e.message : e instanceof Error ? e.message : 'No se pudo enviar la invitación.'
      setInviteBanner({ text: msg, variant: 'error' })
    },
  })

  function handleInviteSubmit(e: React.FormEvent) {
    e.preventDefault()
    setInviteBanner(null)
    if (!inviteName.trim() || !inviteEmail.trim()) {
      setInviteBanner({ text: 'Nombre y email son obligatorios', variant: 'error' })
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
        (u) =>
          u.name.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q),
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
            <ActionButton
              intent="secondary"
              onClick={() => setBulkOpen(true)}
            >
              <Upload className="w-4 h-4 mr-1" />
              Importar
            </ActionButton>
            <ActionButton
              intent="primary"
              onClick={() => {
                setInviteBanner(null)
                setInviteOpen(true)
              }}
            >
              <UserPlus className="w-4 h-4 mr-1" />
              Agregar usuario
            </ActionButton>
          </div>
        }
      />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-5">
        {inviteBanner && (
          <FeedbackBanner message={inviteBanner.text} variant={inviteBanner.variant} />
        )}

        {usersQuery.isError && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            No se pudo cargar la lista de usuarios.
          </div>
        )}

        {!usersQuery.isError && (
          <>
            {/* ── Toolbar ── */}
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

            {/* ── Table ── */}
            <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">

              {/* Desktop header */}
              <div className="hidden md:flex items-center gap-3 px-5 py-2.5 border-b border-border bg-muted/40">
                <div className="w-10 shrink-0" />
                <div className="flex-1 min-w-[8rem]">
                  <SortCol label="Nombre" colKey="name" sortKey={sortKey} sortDir={sortDir} onSort={handleColumnSort} />
                </div>
                <div className="w-52 xl:w-60 shrink-0">
                  <SortCol label="Correo" colKey="email" sortKey={sortKey} sortDir={sortDir} onSort={handleColumnSort} />
                </div>
                <div className="w-[5.5rem] shrink-0 flex justify-end">
                  <SortCol
                    label="Alta"
                    colKey="created_at"
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onSort={handleColumnSort}
                    className="text-right"
                  />
                </div>
                <div className="w-24 shrink-0 flex justify-center">
                  <SortCol label="Rol" colKey="role" sortKey={sortKey} sortDir={sortDir} onSort={handleColumnSort} />
                </div>
                <div className="w-24 shrink-0 flex justify-center">
                  <SortCol label="Estado" colKey="status" sortKey={sortKey} sortDir={sortDir} onSort={handleColumnSort} />
                </div>
                <div className="w-5 shrink-0" />
              </div>

              {/* Skeleton */}
              {usersQuery.isPending && (
                <div className="p-3">
                  <SkeletonRows count={6} />
                </div>
              )}

              {/* Empty */}
              {!usersQuery.isPending && pageRows.length === 0 && (
                <div className="flex flex-col items-center gap-2.5 py-14 text-center px-5">
                  <Users className="w-9 h-9 text-muted-foreground/25" />
                  <p className="text-sm text-muted-foreground">
                    {allUsers.length === 0
                      ? 'Todavía no hay usuarios registrados.'
                      : 'No hay usuarios que coincidan con la búsqueda.'}
                  </p>
                </div>
              )}

              {/* Rows */}
              {!usersQuery.isPending && pageRows.length > 0 && (
                <ul className="p-2 space-y-1.5">
                  {pageRows.map((u: UserDTO) => {
                    const isActive = u.active !== false
                    return (
                      <li
                        key={u.id}
                        onClick={() => openDrawer(u)}
                        className={cn(
                          'group flex flex-wrap md:flex-nowrap items-start md:items-center gap-3 rounded-xl border border-border/70 bg-card px-3 md:px-4 py-3 cursor-pointer hover:bg-muted/30 hover:border-border transition-colors',
                          !isActive && 'opacity-55',
                        )}
                      >
                        {/* Avatar */}
                        <div className="relative shrink-0">
                          <Avatar className="h-9 w-9 md:h-10 md:w-10">
                            <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xs">
                              {getInitials(u.name)}
                            </AvatarFallback>
                          </Avatar>
                          <span
                            className={cn(
                              'absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-card',
                              isActive ? 'bg-emerald-500' : 'bg-slate-300',
                            )}
                          />
                        </div>

                        {/* Name — desktop */}
                        <div className="hidden md:flex flex-1 min-w-[8rem] flex-col justify-center">
                          <p className="text-sm font-semibold leading-tight truncate">{u.name}</p>
                        </div>

                        {/* Email — desktop */}
                        <div className="hidden md:flex w-52 xl:w-60 shrink-0 items-center">
                          <p className="text-xs text-muted-foreground truncate w-full" title={u.email}>
                            {u.email}
                          </p>
                        </div>

                        {/* Name + Email — mobile */}
                        <div className="flex-1 min-w-0 md:hidden">
                          <p className="text-sm font-semibold leading-snug truncate">{u.name}</p>
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">{u.email}</p>
                          <div className="mt-1.5 flex items-center gap-1.5">
                            <Calendar className="w-3 h-3 shrink-0 text-muted-foreground/60" aria-hidden />
                            <span className="text-[11px] text-muted-foreground">
                              Alta {formatUserCreatedAt(u.created_at)}
                            </span>
                          </div>
                        </div>

                        {/* Date — desktop */}
                        <div className="hidden md:flex w-[5.5rem] shrink-0 justify-end text-xs text-muted-foreground tabular-nums leading-tight pt-0.5">
                          {formatUserCreatedAt(u.created_at)}
                        </div>

                        {/* Role badge */}
                        <div className="shrink-0 md:w-24 md:flex md:justify-center self-center md:self-auto">
                          <RoleBadge role={u.role} />
                        </div>

                        {/* Status badge — desktop only */}
                        <div className="hidden md:flex w-24 justify-center">
                          <StatusBadge active={isActive} />
                        </div>

                        {/* Chevron */}
                        <ChevronRight className="w-4 h-4 text-muted-foreground/30 shrink-0 self-center group-hover:text-muted-foreground/60 transition-colors" />
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>

            {filteredTotalPages > 1 && pageRows.length > 0 && (
              <PaginationControls page={safePage} totalPages={filteredTotalPages} onPageChange={setPage} compact />
            )}
          </>
        )}
      </div>

      {/* ─────────────────── Drawer ─────────────────── */}
      <Drawer
        open={Boolean(selected)}
        onOpenChange={(o) => !o && closeDrawer()}
        direction={isDesktop ? 'right' : 'bottom'}
      >
        <DrawerContent className="px-0 pb-0 flex flex-col">
          {selected && (() => {
            const isActive = selected.active !== false
            const projectLinksDrawer = userProjectsByUser?.[selected.id]
            return (
              <div className="flex flex-col overflow-hidden h-full">
                <div className="overflow-y-auto flex-1 px-5 pt-5 pb-10 space-y-6">

                  {/* ── Header ── */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3.5">
                      <div className="relative">
                        <Avatar className="h-14 w-14">
                          <AvatarFallback className="bg-primary/10 text-primary font-bold text-base">
                            {getInitials(selected.name)}
                          </AvatarFallback>
                        </Avatar>
                        <span
                          className={cn(
                            'absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-[2.5px] border-background',
                            isActive ? 'bg-emerald-500' : 'bg-slate-300',
                          )}
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-base leading-snug truncate max-w-[180px]">{selected.name}</p>
                        <p className="text-xs text-muted-foreground truncate max-w-[180px]">{selected.email}</p>
                        <p className="text-[11px] text-muted-foreground mt-1">
                          Alta {formatUserCreatedAt(selected.created_at)}
                        </p>
                        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                          <RoleBadge role={selected.role} />
                          {isOwnAccount && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border border-primary/30 bg-primary/5 text-primary">
                              Mi cuenta
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={closeDrawer}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0 mt-0.5"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="h-px bg-border" />

                  {/* ── Proyectos ── */}
                  <section className="space-y-2.5">
                    <div className="flex items-center gap-2">
                      <FolderKanban className="w-3.5 h-3.5 text-muted-foreground" aria-hidden />
                      <SectionLabel>Proyectos</SectionLabel>
                    </div>
                    {userProjectsQuery.isPending ? (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Cargando…
                      </div>
                    ) : projectLinksDrawer?.length ? (
                      <ul className="rounded-xl border border-border bg-muted/20 divide-y divide-border">
                        {projectLinksDrawer.map((lnk: UserProjectLink) => (
                          <li key={lnk.projectId} className="px-3 py-2.5 flex items-center justify-between gap-3">
                            <Link
                              to={`/app/admin/proyectos/${lnk.projectId}/resumen`}
                              className="text-sm font-medium text-primary hover:underline truncate min-w-0"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {lnk.projectName}
                            </Link>
                            <span className="text-xs text-muted-foreground shrink-0">
                              {labelProjectRole(lnk.role)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-muted-foreground rounded-xl border border-dashed border-border px-4 py-3">
                        No está asociado a ningún proyecto.
                      </p>
                    )}
                  </section>

                  <div className="h-px bg-border" />

                  {/* ── Estado ── */}
                  <section className="space-y-3">
                    <SectionLabel>Estado de la cuenta</SectionLabel>
                    <div className="rounded-xl border border-border bg-card px-4 py-4 space-y-4">
                      <div className="flex gap-3">
                        <div
                          className={cn(
                            'mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
                            isActive ? 'bg-emerald-100' : 'bg-slate-200/80',
                          )}
                        >
                          {isActive ? (
                            <CheckCircle2 className="h-5 w-5 text-emerald-600" aria-hidden />
                          ) : (
                            <XCircle className="h-5 w-5 text-slate-600" aria-hidden />
                          )}
                        </div>
                        <div className="min-w-0 flex-1 space-y-1">
                          <p className="text-sm font-semibold">
                            {isActive ? 'Cuenta activa' : 'Cuenta desactivada'}
                          </p>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            {isActive
                              ? 'Podés desactivar la cuenta si la persona ya no debe acceder al sistema.'
                              : 'Reactivando la cuenta, la persona podrá volver a iniciar sesión con su mismo correo y contraseña.'}
                          </p>
                        </div>
                      </div>
                      {!isOwnAccount ? (
                        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                          {isActive ? (
                            <ActionButton
                              type="button"
                              intent="delete"
                              className="w-full sm:w-auto"
                              disabled={statusMutation.isPending}
                              onClick={() => setConfirmDeactivateOpen(true)}
                            >
                              {statusMutation.isPending
                                ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                                : <XCircle className="mr-2 h-4 w-4" aria-hidden />}
                              Desactivar cuenta
                            </ActionButton>
                          ) : (
                            <ActionButton
                              type="button"
                              intent="primary"
                              className="w-full sm:w-auto"
                              disabled={statusMutation.isPending}
                              onClick={() => statusMutation.mutate({ id: selected.id, active: true })}
                            >
                              {statusMutation.isPending
                                ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                                : <CheckCircle2 className="mr-2 h-4 w-4" aria-hidden />}
                              Reactivar cuenta
                            </ActionButton>
                          )}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground rounded-lg bg-muted/50 px-3 py-2">
                          No podés desactivar tu propia cuenta desde este panel para evitar quedar sin acceso como administrador.
                        </p>
                      )}
                    </div>
                  </section>

                  {/* ── Rol (admin) ── */}
                  {isAdmin && (
                    <section className="space-y-2.5">
                      <SectionLabel>Rol</SectionLabel>
                      <Select
                        value={selected.role}
                        onValueChange={(val) =>
                          roleMutation.mutate({ id: selected.id, role: val as UpdateUserRoleBody['role'] })
                        }
                        disabled={roleMutation.isPending}
                      >
                        <SelectTrigger className="h-11">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="user">Usuario</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </section>
                  )}

                  <div className="h-px bg-border" />

                  {/* ── Datos del usuario ── */}
                  <section className="space-y-3">
                    <SectionLabel>Datos del usuario</SectionLabel>
                    <form onSubmit={handleEditSubmit} className="space-y-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="edit-name">Nombre</Label>
                        <Input
                          id="edit-name"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          placeholder="Nombre completo"
                          className="h-11"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="edit-email">Email</Label>
                        <Input
                          id="edit-email"
                          type="email"
                          value={editEmail}
                          onChange={(e) => setEditEmail(e.target.value)}
                          placeholder="email@macabi.org.ar"
                          className="h-11"
                        />
                      </div>
                      {editError && (
                        <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">{editError}</p>
                      )}
                      {editMutation.isSuccess && (
                        <p className="text-sm text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2">
                          <CheckCircle2 className="inline w-3.5 h-3.5 mr-1.5 align-text-bottom" />
                          Cambios guardados
                        </p>
                      )}
                      <Button type="submit" className="w-full h-11" disabled={editMutation.isPending}>
                        {editMutation.isPending
                          ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Guardando...</>
                          : 'Guardar cambios'}
                      </Button>
                    </form>
                  </section>

                  {/* ── Contraseña (solo cuenta propia) ── */}
                  {isOwnAccount && (
                    <>
                      <div className="h-px bg-border" />
                      <section className="space-y-3">
                        <div className="flex items-center gap-2">
                          <KeyRound className="w-3.5 h-3.5 text-muted-foreground" />
                          <SectionLabel>Cambiar contraseña</SectionLabel>
                        </div>
                        <form onSubmit={handlePasswordSubmit} className="space-y-3">
                          <PasswordField id="pw-current" label="Contraseña actual"         value={pwCurrent}  onChange={setPwCurrent} />
                          <PasswordField id="pw-new"     label="Nueva contraseña"          value={pwNew}      onChange={setPwNew} />
                          <PasswordField id="pw-confirm" label="Confirmar nueva contraseña" value={pwConfirm}  onChange={setPwConfirm} />
                          {pwError && (
                            <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">{pwError}</p>
                          )}
                          {pwSuccess && (
                            <p className="text-sm text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2">
                              <CheckCircle2 className="inline w-3.5 h-3.5 mr-1.5 align-text-bottom" />
                              Contraseña actualizada correctamente
                            </p>
                          )}
                          <Button
                            type="submit"
                            variant="outline"
                            className="w-full h-11"
                            disabled={pwMutation.isPending}
                          >
                            {pwMutation.isPending
                              ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Actualizando...</>
                              : <><KeyRound className="mr-2 h-4 w-4" />Actualizar contraseña</>}
                          </Button>
                        </form>
                      </section>
                    </>
                  )}
                </div>
              </div>
            )
          })()}
        </DrawerContent>
      </Drawer>

      {/* ─────────────────── Bulk invite dialog ─────────────────── */}
      <BulkInviteDialog
        open={bulkOpen}
        onOpenChange={setBulkOpen}
        token={token!}
        onDone={() => {
          queryClient.invalidateQueries({ queryKey: ['admin-users-all'] })
        }}
      />

      {/* ─────────────────── Invite dialog ─────────────────── */}
      <Dialog
        open={inviteOpen}
        onOpenChange={(open: boolean) => {
          setInviteOpen(open)
          if (!open) {
            setInviteName('')
            setInviteEmail('')
            setInviteRole('user')
            inviteMutation.reset()
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                <UserPlus className="w-4 h-4 text-primary" />
              </div>
              Agregar usuario
            </DialogTitle>
            <p className="text-sm text-muted-foreground pt-1">
              Se envía una invitación por correo. La persona definirá su contraseña al aceptar.
            </p>
          </DialogHeader>
          <form onSubmit={handleInviteSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="invite-name" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Nombre</Label>
              <Input id="invite-name" value={inviteName} onChange={(e) => setInviteName(e.target.value)} placeholder="Nombre completo" className="h-11" autoComplete="name" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="invite-email" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Correo</Label>
              <Input id="invite-email" type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="correo@ejemplo.org" className="h-11" autoComplete="email" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Rol inicial</Label>
              <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as 'user' | 'admin')}>
                <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">Usuario</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" onClick={() => setInviteOpen(false)} disabled={inviteMutation.isPending}>
                Cancelar
              </Button>
              <Button type="submit" disabled={inviteMutation.isPending}>
                {inviteMutation.isPending
                  ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Enviando…</>
                  : <><UserPlus className="mr-2 h-4 w-4" />Enviar invitación</>}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─────────────────── Confirm deactivate ─────────────────── */}
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
