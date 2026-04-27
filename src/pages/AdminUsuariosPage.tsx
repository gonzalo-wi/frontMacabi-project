import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Users, ShieldCheck, ShieldAlert, User,
  ChevronLeft, ChevronRight, Loader2, X,
  CheckCircle2, XCircle, Eye, EyeOff,
  KeyRound, UserCheck, UserX,
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
import { useAuth } from '@/hooks/useAuth'
import { getUsers, updateUserRole, updateUserStatus, updateUser } from '@/lib/api/admin'
import { changePassword } from '@/lib/api/auth'
import type { UserDTO, UpdateUserRoleBody } from '@/lib/api/types'

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
  SuperAdmin: { label: 'Super Admin', icon: ShieldAlert, classes: 'bg-red-50 text-red-700 border-red-200' },
  Admin:      { label: 'Admin',       icon: ShieldCheck,  classes: 'bg-blue-50 text-blue-700 border-blue-200' },
  User:       { label: 'Usuario',     icon: User,          classes: 'bg-slate-100 text-slate-600 border-slate-200' },
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
  const isSuperAdmin = me?.role === 'super_admin' || me?.role === 'SuperAdmin'
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<UserDTO | null>(null)

  // Edit fields
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

  return (
    <div className="min-h-screen">
      <PageHeader icon={Users} title="Usuarios" subtitle="Listado y gestión de usuarios" />

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
                  </span>
                </p>
                <p className="w-28 text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Rol</p>
                <p className="w-24 text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Estado</p>
                <div className="w-5 shrink-0" />
              </div>

              {/* Mobile header */}
              <div className="flex md:hidden items-center justify-between px-4 py-2.5 border-b border-border bg-muted/40">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {data.total} usuario{data.total !== 1 ? 's' : ''}
                </p>
                {totalPages > 1 && (
                  <p className="text-xs text-muted-foreground">Pág. {data.page}/{data.total_pages}</p>
                )}
              </div>

              <ul className="divide-y divide-border">
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

                      <ChevronRight className="w-4 h-4 text-muted-foreground/30 shrink-0 group-hover:text-muted-foreground/60 transition-colors" />
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
                          <SelectItem value="User">Usuario</SelectItem>
                          <SelectItem value="Admin">Admin</SelectItem>
                          <SelectItem value="SuperAdmin">Super Admin</SelectItem>
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
    </div>
  )
}
