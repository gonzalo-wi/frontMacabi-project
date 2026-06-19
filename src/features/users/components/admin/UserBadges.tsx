import { CheckCircle2, Clock, Mail, ShieldCheck, User, XCircle } from 'lucide-react'

import type { UserInvitationStatus } from '@/lib/api/types'
import { cn } from '@/lib/utils'

const ROLE_META: Record<string, {
  label: string
  icon: React.ElementType
  classes: string
}> = {
  admin: { label: 'Admin', icon: ShieldCheck, classes: 'bg-blue-50 text-blue-700 border-blue-200' },
  user: { label: 'Usuario', icon: User, classes: 'bg-slate-100 text-slate-600 border-slate-200' },
}

export function RoleBadge({ role }: { role: string }) {
  const meta = ROLE_META[role] ?? { label: role, classes: 'bg-slate-100 text-slate-600 border-slate-200', icon: User }
  const Icon = meta.icon
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${meta.classes}`}>
      <Icon className="w-3 h-3" />
      {meta.label}
    </span>
  )
}

const STATUS_META: Record<UserInvitationStatus, {
  label: string
  icon: React.ElementType
  classes: string
}> = {
  draft: {
    label: 'Sin invitar',
    icon: User,
    classes: 'bg-sky-50 text-sky-700 border-sky-200',
  },
  invited: {
    label: 'Invitación pendiente',
    icon: Mail,
    classes: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  active: {
    label: 'Activo',
    icon: CheckCircle2,
    classes: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  inactive: {
    label: 'Inactivo',
    icon: XCircle,
    classes: 'bg-slate-100 text-slate-500 border-slate-200',
  },
}

export function InvitationStatusBadge({ status }: { status: UserInvitationStatus }) {
  const meta = STATUS_META[status]
  const Icon = meta.icon
  return (
    <span className={cn(
      'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border',
      meta.classes,
    )}>
      <Icon className="w-3 h-3" />
      {meta.label}
    </span>
  )
}

/** @deprecated Use InvitationStatusBadge */
export function StatusBadge({ active }: { active: boolean }) {
  return <InvitationStatusBadge status={active ? 'active' : 'inactive'} />
}

export function PendingAccessHint() {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border border-amber-200 bg-amber-50 text-amber-700">
      <Clock className="w-3 h-3" />
      Sin acceso
    </span>
  )
}
