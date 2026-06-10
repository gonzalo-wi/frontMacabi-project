import { CheckCircle2, ShieldCheck, User, XCircle } from 'lucide-react'

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

export function StatusBadge({ active }: { active: boolean }) {
  return (
    <span className={cn(
      'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border',
      active
        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
        : 'bg-slate-100 text-slate-500 border-slate-200',
    )}>
      {active
        ? <><CheckCircle2 className="w-3 h-3" />Activo</>
        : <><XCircle className="w-3 h-3" />Inactivo</>}
    </span>
  )
}
