import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle2, FolderKanban, KeyRound, Loader2, X, XCircle } from 'lucide-react'

import { ActionButton } from '@/components/ActionButton'
import { PasswordInput } from '@/components/PasswordInput'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { labelProjectRole } from '@/features/projects/lib/projectLabels'
import type { UserProjectLink } from '@/features/projects/lib/userProjectsIndex'
import { RoleBadge } from '@/features/users/components/admin/UserBadges'
import { formatUserCreatedAt } from '@/features/users/lib/userHelpers'
import type { UpdateUserRoleBody, UserDTO } from '@/lib/api/types'
import { cn, getInitials } from '@/lib/utils'

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
      {children}
    </p>
  )
}

function PasswordField({
  id,
  label,
  value,
  onChange,
}: {
  id: string
  label: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <PasswordInput
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="••••••••"
        className="h-11"
      />
    </div>
  )
}

type EditState = {
  name: string
  email: string
  error: string
  pending: boolean
  success: boolean
  onName: (v: string) => void
  onEmail: (v: string) => void
  onSubmit: (e: React.FormEvent) => void
}

type PasswordState = {
  current: string
  next: string
  confirm: string
  error: string
  success: boolean
  pending: boolean
  onCurrent: (v: string) => void
  onNext: (v: string) => void
  onConfirm: (v: string) => void
  onSubmit: (e: React.FormEvent) => void
}

export function UserDrawerContent({
  user,
  isOwnAccount,
  isAdmin,
  projectsLoading,
  projectLinks,
  edit,
  password,
  onClose,
  onConfirmDeactivate,
  onReactivate,
  statusPending,
  onRoleChange,
  rolePending,
}: {
  user: UserDTO
  isOwnAccount: boolean
  isAdmin: boolean
  projectsLoading: boolean
  projectLinks: UserProjectLink[] | undefined
  edit: EditState
  password: PasswordState
  onClose: () => void
  onConfirmDeactivate: () => void
  onReactivate: () => void
  statusPending: boolean
  onRoleChange: (role: UpdateUserRoleBody['role']) => void
  rolePending: boolean
}) {
  const isActive = user.active !== false

  return (
    <div className="flex flex-col overflow-hidden h-full">
      <div className="overflow-y-auto flex-1 px-5 pt-5 pb-10 space-y-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3.5">
            <div className="relative">
              <Avatar className="h-14 w-14">
                <AvatarFallback className="bg-primary/10 text-primary font-bold text-base">
                  {getInitials(user.name)}
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
              <p className="font-semibold text-base leading-snug truncate max-w-[180px]">{user.name}</p>
              <p className="text-xs text-muted-foreground truncate max-w-[180px]">{user.email}</p>
              <p className="text-[11px] text-muted-foreground mt-1">
                Alta {formatUserCreatedAt(user.created_at)}
              </p>
              <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                <RoleBadge role={user.role} />
                {isOwnAccount && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border border-primary/30 bg-primary/5 text-primary">
                    Mi cuenta
                  </span>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0 mt-0.5"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="h-px bg-border" />

        <section className="space-y-2.5">
          <div className="flex items-center gap-2">
            <FolderKanban className="w-3.5 h-3.5 text-muted-foreground" aria-hidden />
            <SectionLabel>Proyectos</SectionLabel>
          </div>
          {projectsLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Cargando…
            </div>
          ) : projectLinks?.length ? (
            <ul className="rounded-xl border border-border bg-muted/20 divide-y divide-border">
              {projectLinks.map((lnk) => (
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
                    disabled={statusPending}
                    onClick={onConfirmDeactivate}
                  >
                    {statusPending
                      ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                      : <XCircle className="mr-2 h-4 w-4" aria-hidden />}
                    Desactivar cuenta
                  </ActionButton>
                ) : (
                  <ActionButton
                    type="button"
                    intent="primary"
                    className="w-full sm:w-auto"
                    disabled={statusPending}
                    onClick={onReactivate}
                  >
                    {statusPending
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

        {isAdmin && (
          <section className="space-y-2.5">
            <SectionLabel>Rol</SectionLabel>
            <Select
              value={user.role}
              onValueChange={(val) => onRoleChange(val as UpdateUserRoleBody['role'])}
              disabled={rolePending}
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

        <section className="space-y-3">
          <SectionLabel>Datos del usuario</SectionLabel>
          <form onSubmit={edit.onSubmit} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="edit-name">Nombre</Label>
              <Input
                id="edit-name"
                value={edit.name}
                onChange={(e) => edit.onName(e.target.value)}
                placeholder="Nombre completo"
                className="h-11"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={edit.email}
                onChange={(e) => edit.onEmail(e.target.value)}
                placeholder="email@macabi.org.ar"
                className="h-11"
              />
            </div>
            {edit.error && (
              <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">{edit.error}</p>
            )}
            {edit.success && (
              <p className="text-sm text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2">
                <CheckCircle2 className="inline w-3.5 h-3.5 mr-1.5 align-text-bottom" />
                Cambios guardados
              </p>
            )}
            <Button type="submit" className="w-full h-11" disabled={edit.pending}>
              {edit.pending
                ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Guardando...</>
                : 'Guardar cambios'}
            </Button>
          </form>
        </section>

        {isOwnAccount && (
          <>
            <div className="h-px bg-border" />
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <KeyRound className="w-3.5 h-3.5 text-muted-foreground" />
                <SectionLabel>Cambiar contraseña</SectionLabel>
              </div>
              <form onSubmit={password.onSubmit} className="space-y-3">
                <PasswordField id="pw-current" label="Contraseña actual" value={password.current} onChange={password.onCurrent} />
                <PasswordField id="pw-new" label="Nueva contraseña" value={password.next} onChange={password.onNext} />
                <PasswordField id="pw-confirm" label="Confirmar nueva contraseña" value={password.confirm} onChange={password.onConfirm} />
                {password.error && (
                  <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">{password.error}</p>
                )}
                {password.success && (
                  <p className="text-sm text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2">
                    <CheckCircle2 className="inline w-3.5 h-3.5 mr-1.5 align-text-bottom" />
                    Contraseña actualizada correctamente
                  </p>
                )}
                <Button type="submit" variant="outline" className="w-full h-11" disabled={password.pending}>
                  {password.pending
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
}
