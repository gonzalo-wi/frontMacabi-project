import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Users, ShieldCheck, ShieldAlert, User,
  ChevronLeft, ChevronRight, Loader2, X,
  CheckCircle2, XCircle, Eye, EyeOff,
  KeyRound, UserCheck, UserX,
  UserPlus, Mail, RefreshCw, Ban,
} from 'lucide-react'

import { PageHeader } from '@/components/PageHeader'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Drawer, DrawerContent } from '@/components/ui/drawer'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useAuth } from '@/hooks/useAuth'
import { getUsers, updateUserRole, updateUserStatus, updateUser, createUserInvitation, getPendingInvitations, resendUserInvitation, revokeUserInvitation } from '@/lib/api/admin'
import { changePassword } from '@/lib/api/auth'
import { ApiError } from '@/lib/api/apiClient'
import type { UserDTO, UpdateUserRoleBody, PendingInvitationDTO } from '@/lib/api/types'

const PAGE_SIZE = 20

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(
    () => typeof window !== 'undefined' && window.innerWidth >= 768,
  )
  useEffect(() => {
    const fn = () => setIsDesktop(window.innerWidth >= 768)
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [])
  return isDesktop
}

const ROLE_META: Record<string, {
  label: string
  icon: React.ElementType
  classes: string
}> = {
  super_admin: { label: 'Super Admin', icon: ShieldAlert, classes: 'bg-red-50 text-red-700 border-red-200' },
  admin:       { label: 'Admin',       icon: ShieldCheck,  classes: 'bg-blue-50 text-blue-700 border-blue-200' },
  user:        { label: 'Usuario',     icon: User,          classes: 'bg-slate-100 text-slate-600 border-slate-200' },
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

function getInitials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
}

function isInviteExpired(inv: PendingInvitationDTO) {
  return new Date(inv.expires_at).getTime() < Date.now()
}

function PasswordField({
  id, label, value, onChange, placeholder,
}: {
  id: string; label: string; value: string
  onChange: (v: string) => void; placeholder?: string
}) {
  const [show, setShow] = useState(false)
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder ?? '••••••••'}
          className="h-11 pr-10"
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
        >
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
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

export default function AdminUsuariosPage() {
  const { token, user: me } = useAuth()
  const queryClient = useQueryClient()
  const isDesktop = useIsDesktop()
  const isSuperAdmin = me?.role === 'super_admin'
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<UserDTO | null>(null)

  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteName, setInviteName] = useState('')
  const [inviteRole, setInviteRole] = useState<'user' | 'admin'>('user')
  const [inviteError, setInviteError] = useState('')
  const [revokeTarget, setRevokeTarget] = useState<PendingInvitationDTO | null>(null)
  const [revokeError, setRevokeError] = useState('')
  const [editName, setEditName]   = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editError, setEditError] = useState('')

  // Password fields
  const [pwCurrent,  setPwCurrent]  = useState('')
  const [pwNew,      setPwNew]      = useState('')
  const [pwConfirm,  setPwConfirm]  = useState('')
  const [pwError,    setPwError]    = useState('')
  const [pwSuccess,  setPwSuccess]  = useState(false)

  const usersQuery = useQuery({
    queryKey: ['admin-users', page],
    queryFn: () => getUsers(token!, page, PAGE_SIZE),
    enabled: Boolean(token),
  })

  const pendingQuery = useQuery({
    queryKey: ['admin-pending-invitations'],
    queryFn: () => getPendingInvitations(token!),
    enabled: Boolean(token),
  })

  const inviteMutation = useMutation({
    mutationFn: () =>
      createUserInvitation(token!, {
        email: inviteEmail.trim(),
        name: inviteName.trim(),
        ...(isSuperAdmin ? { role: inviteRole } : {}),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      queryClient.invalidateQueries({ queryKey: ['admin-pending-invitations'] })
      setInviteEmail('')
      setInviteName('')
      setInviteRole('user')
      setInviteError('')
      setInviteOpen(false)
    },
    onError: (err: unknown) => {
      const message =
        err instanceof ApiError ? err.message : 'No se pudo enviar la invitación'
      setInviteError(message)
    },
  })

  const resendInviteMutation = useMutation({
    mutationFn: (invitationId: string) => resendUserInvitation(token!, invitationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-pending-invitations'] })
    },
  })

  const revokeInviteMutation = useMutation({
    mutationFn: (invitationId: string) => revokeUserInvitation(token!, invitationId),
    onMutate: () => setRevokeError(''),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-pending-invitations'] })
      setRevokeTarget(null)
    },
    onError: (err: unknown) => {
      setRevokeError(err instanceof ApiError ? err.message : 'No se pudo revocar la invitación')
    },
  })

  const roleMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: UpdateUserRoleBody['role'] }) =>
      updateUserRole(token!, id, { role }),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      setSelected((prev) => prev ? { ...prev, role: vars.role } : prev)
    },
  })

  const statusMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      updateUserStatus(token!, id, { active }),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      setSelected((prev) => prev ? { ...prev, active: vars.active } : prev)
    },
  })

  const editMutation = useMutation({
    mutationFn: ({ id, name, email }: { id: string; name: string; email: string }) =>
      updateUser(token!, id, { name, email }),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
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

  function handleInviteOpenChange(open: boolean) {
    setInviteOpen(open)
    if (!open) {
      setInviteEmail('')
      setInviteName('')
      setInviteRole('user')
      setInviteError('')
      inviteMutation.reset()
    }
  }

  function handleInviteSubmit(e: React.FormEvent) {
    e.preventDefault()
    setInviteError('')
    if (!inviteEmail.trim() || !inviteName.trim()) {
      setInviteError('Completá email y nombre')
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

  function closeDrawer() { setSelected(null) }

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

  const data = usersQuery.data
  const totalPages = data?.total_pages ?? 1
  const isOwnAccount = Boolean(selected && me && selected.id === me.id)
  const pendingInvites = pendingQuery.data?.data ?? []
  const pendingCount = pendingInvites.length

  return (
    <div className="min-h-screen">
      <PageHeader
        icon={Users}
        title="Usuarios"
        subtitle="Listado y gestión de usuarios"
        action={
          <Button
            size="sm"
            className="h-9 gap-1.5"
            onClick={() => handleInviteOpenChange(true)}
          >
            <UserPlus className="w-4 h-4" />
            <span className="hidden sm:inline">Invitar</span>
          </Button>
        }
      />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-5">

        {/* ── Loading / Error ── */}
        {usersQuery.isLoading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {usersQuery.isError && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            No se pudo cargar la lista de usuarios.
          </div>
        )}

        {pendingQuery.isError && (
          <div className="rounded-xl border border-amber-200/80 bg-amber-50/80 dark:bg-amber-950/30 px-4 py-3 text-sm text-amber-900 dark:text-amber-100">
            No se pudieron cargar las invitaciones pendientes. Intentá actualizar la página.
          </div>
        )}

        {/* ── User list ── */}
        {data && (
          <>
            <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">

              {/* Table header — desktop */}
              <div className="hidden md:flex items-center gap-4 px-5 py-2.5 border-b border-border bg-muted/40">
                <div className="w-10 shrink-0" />
                <p className="flex-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Usuario
                  <span className="ml-2 text-muted-foreground/50 font-normal normal-case tracking-normal">
                    — {data.total} en total
                    {pendingCount > 0 ? ` · ${pendingCount} invitado(s) pendiente(s)` : ''}
                  </span>
                </p>
                <p className="w-28 text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Rol</p>
                <p className="w-24 text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Estado</p>
                <div className="w-[168px] shrink-0 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground hidden md:block pr-1">
                  Acciones
                </div>
              </div>

              {/* Mobile header */}
              <div className="flex md:hidden items-center justify-between px-4 py-2.5 border-b border-border bg-muted/40">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {data.total} usuario{data.total !== 1 ? 's' : ''}
                    {pendingCount > 0 && (
                      <span className="block text-[10px] font-normal normal-case tracking-normal text-amber-800/90 mt-0.5">
                        {pendingCount} invitado(s) pendiente(s)
                      </span>
                    )}
                  </p>
                </div>
                {totalPages > 1 && (
                  <p className="text-xs text-muted-foreground">Pág. {data.page}/{data.total_pages}</p>
                )}
              </div>

              <ul className="divide-y divide-border">
                {pendingQuery.isLoading && pendingCount === 0 && (
                  <li className="flex items-center gap-3 px-4 md:px-5 py-3 text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                    Cargando invitaciones pendientes…
                  </li>
                )}
                {pendingInvites.map((inv) => {
                  const expired = isInviteExpired(inv)
                  const resending =
                    resendInviteMutation.isPending && resendInviteMutation.variables === inv.id
                  const revoking =
                    revokeInviteMutation.isPending && revokeInviteMutation.variables === inv.id
                  const rowBusy = resending || revoking
                  return (
                    <li
                      key={`invite-${inv.id}`}
                      className="group flex items-center gap-3 md:gap-4 px-4 md:px-5 py-3.5 bg-amber-50/50 dark:bg-amber-950/20"
                    >
                      <div className="relative shrink-0">
                        <Avatar className="h-9 w-9 md:h-10 md:w-10 border border-amber-200/80 dark:border-amber-800/50">
                          <AvatarFallback className="bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200">
                            <Mail className="w-4 h-4" />
                          </AvatarFallback>
                        </Avatar>
                        <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-card bg-amber-400" title="Invitación enviada" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 min-w-0">
                          <p className="text-sm font-medium leading-none truncate">{inv.name}</p>
                          <span
                            className={`md:hidden shrink-0 text-[10px] font-bold uppercase tracking-tight px-1.5 py-0.5 rounded border ${
                              expired
                                ? 'bg-orange-50 text-orange-800 border-orange-200 dark:bg-orange-950/50 dark:text-orange-200 dark:border-orange-800'
                                : 'bg-amber-100 text-amber-900 border-amber-200 dark:bg-amber-900/50 dark:text-amber-100 dark:border-amber-800'
                            }`}
                          >
                            {expired ? 'Expirada' : 'Invitado'}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">{inv.email}</p>
                      </div>
                      <div className="hidden md:flex shrink-0 md:w-28 justify-center">
                        <RoleBadge role={inv.role} />
                      </div>
                      <div className="hidden md:flex w-24 justify-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
                            expired
                              ? 'bg-orange-50 text-orange-800 border-orange-200 dark:bg-orange-950/40 dark:text-orange-200 dark:border-orange-800'
                              : 'bg-amber-50 text-amber-900 border-amber-200 dark:bg-amber-950/40 dark:text-amber-100 dark:border-amber-800'
                          }`}
                        >
                          {expired ? 'Link expirado' : 'Invitado'}
                        </span>
                      </div>
                      <div className="flex items-center justify-end shrink-0 md:w-[168px] gap-1 flex-wrap md:flex-nowrap">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 px-2 gap-1 border-amber-200/80 dark:border-amber-800 bg-background"
                          disabled={rowBusy}
                          title="Reenviar correo con nuevo enlace"
                          onClick={(e) => {
                            e.stopPropagation()
                            resendInviteMutation.mutate(inv.id)
                          }}
                        >
                          {resending ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <RefreshCw className="w-3.5 h-3.5" />
                          )}
                          <span className="hidden sm:inline text-xs">Reenviar</span>
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 px-2 gap-1 border-destructive/25 text-destructive hover:bg-destructive/10"
                          disabled={rowBusy}
                          title="Revocar invitación"
                          onClick={(e) => {
                            e.stopPropagation()
                            setRevokeError('')
                            setRevokeTarget(inv)
                          }}
                        >
                          <Ban className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline text-xs">Revocar</span>
                        </Button>
                      </div>
                    </li>
                  )
                })}
                {data.data.map((u: UserDTO) => {
                  const isActive = u.active !== false
                  return (
                    <li
                      key={u.id}
                      onClick={() => openDrawer(u)}
                      className={`group flex items-center gap-3 md:gap-4 px-4 md:px-5 py-3.5 cursor-pointer hover:bg-muted/40 transition-colors ${!isActive ? 'opacity-55' : ''}`}
                    >
                      {/* Avatar + status dot */}
                      <div className="relative shrink-0">
                        <Avatar className="h-9 w-9 md:h-10 md:w-10">
                          <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xs">
                            {getInitials(u.name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-card ${isActive ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                      </div>

                      {/* Name + email */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium leading-none truncate">{u.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">{u.email}</p>
                      </div>

                      {/* Role */}
                      <div className="shrink-0 md:w-28 md:flex md:justify-center">
                        <RoleBadge role={u.role} />
                      </div>

                      {/* Status — desktop only */}
                      <div className="hidden md:flex w-24 justify-center">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
                          isActive
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-slate-100 text-slate-500 border-slate-200'
                        }`}>
                          {isActive
                            ? <><CheckCircle2 className="w-3 h-3" />Activo</>
                            : <><XCircle className="w-3 h-3" />Inactivo</>
                          }
                        </span>
                      </div>

                      <div className="flex items-center justify-end shrink-0 md:w-[168px]">
                        <ChevronRight className="w-4 h-4 text-muted-foreground/30 shrink-0 group-hover:text-muted-foreground/60 transition-colors" />
                      </div>
                    </li>
                  )
                })}
              </ul>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-2 rounded-lg border border-border bg-card hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm text-muted-foreground">{page} / {totalPages}</span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-2 rounded-lg border border-border bg-card hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Drawer ─────────────────────────────────────────── */}
      <Drawer
        open={Boolean(selected)}
        onOpenChange={(o) => !o && closeDrawer()}
        direction={isDesktop ? 'right' : 'bottom'}
      >
        <DrawerContent className="px-0 pb-0 flex flex-col">
          {selected && (() => {
            const isActive = selected.active !== false
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
                        <span className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-[2.5px] border-background ${isActive ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-base leading-snug truncate max-w-[180px]">{selected.name}</p>
                        <p className="text-xs text-muted-foreground truncate max-w-[180px]">{selected.email}</p>
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

                  {/* ── Estado ── */}
                  <section className="space-y-2.5">
                    <SectionLabel>Estado de la cuenta</SectionLabel>
                    <div className="rounded-xl border border-border bg-muted/30 px-4 py-3.5 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium">{isActive ? 'Cuenta activa' : 'Cuenta inactiva'}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {isActive ? 'Puede iniciar sesión' : 'No puede iniciar sesión'}
                        </p>
                      </div>
                      <button
                        onClick={() => statusMutation.mutate({ id: selected.id, active: !isActive })}
                        disabled={statusMutation.isPending}
                        className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-colors disabled:opacity-50 ${
                          isActive
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                            : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                        }`}
                      >
                        {statusMutation.isPending
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          : isActive
                            ? <><UserCheck className="w-3.5 h-3.5" />Activo</>
                            : <><UserX className="w-3.5 h-3.5" />Inactivo</>
                        }
                      </button>
                    </div>
                  </section>

                  {/* ── Rol (superadmin) ── */}
                  {isSuperAdmin && (
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
                          <SelectItem value="super_admin">Super Admin</SelectItem>
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
                          : 'Guardar cambios'
                        }
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
                          <PasswordField
                            id="pw-current"
                            label="Contraseña actual"
                            value={pwCurrent}
                            onChange={setPwCurrent}
                          />
                          <PasswordField
                            id="pw-new"
                            label="Nueva contraseña"
                            value={pwNew}
                            onChange={setPwNew}
                          />
                          <PasswordField
                            id="pw-confirm"
                            label="Confirmar nueva contraseña"
                            value={pwConfirm}
                            onChange={setPwConfirm}
                          />

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
                              : <><KeyRound className="mr-2 h-4 w-4" />Actualizar contraseña</>
                            }
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

      <Dialog open={inviteOpen} onOpenChange={handleInviteOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Invitar usuario</DialogTitle>
            <p className="text-sm text-muted-foreground font-normal pt-1">
              Se enviará un correo con un enlace para que elija su contraseña.
            </p>
          </DialogHeader>
          <form onSubmit={handleInviteSubmit} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="invite-email">Email</Label>
              <Input
                id="invite-email"
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="correo@ejemplo.org"
                className="h-11"
                autoComplete="off"
                disabled={inviteMutation.isPending}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="invite-name">Nombre</Label>
              <Input
                id="invite-name"
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
                placeholder="Nombre completo"
                className="h-11"
                disabled={inviteMutation.isPending}
              />
            </div>
            {isSuperAdmin && (
              <div className="space-y-1.5">
                <Label>Rol al aceptar</Label>
                <Select
                  value={inviteRole}
                  onValueChange={(v) => setInviteRole(v as 'user' | 'admin')}
                  disabled={inviteMutation.isPending}
                >
                  <SelectTrigger className="h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">Usuario</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            {inviteError && (
              <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2 border border-destructive/20">
                {inviteError}
              </p>
            )}
            <Button type="submit" className="w-full h-11" disabled={inviteMutation.isPending}>
              {inviteMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Enviar invitación
                </>
              )}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={revokeTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setRevokeTarget(null)
            setRevokeError('')
            revokeInviteMutation.reset()
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Revocar invitación?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>
                  {revokeTarget
                    ? `Se anulará el enlace enviado a ${revokeTarget.email}. La persona no podrá registrarse con ese correo salvo que envíes una invitación nueva.`
                    : null}
                </p>
                {revokeError ? (
                  <p className="text-destructive font-medium">{revokeError}</p>
                ) : null}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={revokeInviteMutation.isPending}>Cancelar</AlertDialogCancel>
            <Button
              variant="destructive"
              disabled={revokeInviteMutation.isPending || !revokeTarget}
              onClick={() => {
                if (revokeTarget) revokeInviteMutation.mutate(revokeTarget.id)
              }}
            >
              {revokeInviteMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Ban className="mr-2 h-4 w-4" />
              )}
              Revocar
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
