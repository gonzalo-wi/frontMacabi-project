import { Calendar, ChevronRight, Users } from 'lucide-react'

import { SkeletonRows } from '@/components/data/SkeletonRows'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { RoleBadge, StatusBadge } from '@/features/users/components/admin/UserBadges'
import { formatUserCreatedAt } from '@/features/users/lib/userHelpers'
import type { UserDTO } from '@/lib/api/types'
import { cn, getInitials } from '@/lib/utils'

export function UsersTable({
  pageRows,
  totalUsers,
  isPending,
  onOpenDrawer,
}: {
  pageRows: UserDTO[]
  totalUsers: number
  isPending: boolean
  onOpenDrawer: (u: UserDTO) => void
}) {
  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
      <div className="hidden md:flex items-center gap-3 px-5 py-2.5 border-b border-border bg-muted/40 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        <div className="w-10 shrink-0" />
        <div className="flex-1 min-w-[8rem]">Nombre</div>
        <div className="w-52 xl:w-60 shrink-0">Correo</div>
        <div className="w-[5.5rem] shrink-0 text-right">Alta</div>
        <div className="w-24 shrink-0 text-center">Rol</div>
        <div className="w-24 shrink-0 text-center">Estado</div>
        <div className="w-5 shrink-0" />
      </div>

      {isPending && (
        <div className="p-3">
          <SkeletonRows count={6} className="h-[68px]" />
        </div>
      )}

      {!isPending && pageRows.length === 0 && (
        <div className="flex flex-col items-center gap-2.5 py-14 text-center px-5">
          <Users className="w-9 h-9 text-muted-foreground/25" />
          <p className="text-sm text-muted-foreground">
            {totalUsers === 0
              ? 'Todavía no hay usuarios registrados.'
              : 'No hay usuarios que coincidan con la búsqueda.'}
          </p>
        </div>
      )}

      {!isPending && pageRows.length > 0 && (
        <ul className="p-2 space-y-1.5">
          {pageRows.map((u) => {
            const isActive = u.active !== false
            return (
              <li
                key={u.id}
                onClick={() => onOpenDrawer(u)}
                className={cn(
                  'group flex flex-wrap md:flex-nowrap items-start md:items-center gap-3 rounded-xl border border-border/70 bg-card px-3 md:px-4 py-3 cursor-pointer hover:bg-muted/30 hover:border-border transition-colors',
                  !isActive && 'opacity-55',
                )}
              >
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

                <div className="hidden md:flex flex-1 min-w-[8rem] flex-col justify-center">
                  <p className="text-sm font-semibold leading-tight truncate">{u.name}</p>
                </div>

                <div className="hidden md:flex w-52 xl:w-60 shrink-0 items-center">
                  <p className="text-xs text-muted-foreground truncate w-full" title={u.email}>
                    {u.email}
                  </p>
                </div>

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

                <div className="hidden md:flex w-[5.5rem] shrink-0 justify-end text-xs text-muted-foreground tabular-nums leading-tight pt-0.5">
                  {formatUserCreatedAt(u.created_at)}
                </div>

                <div className="shrink-0 md:w-24 md:flex md:justify-center self-center md:self-auto">
                  <RoleBadge role={u.role} />
                </div>

                <div className="hidden md:flex w-24 justify-center">
                  <StatusBadge active={isActive} />
                </div>

                <ChevronRight className="w-4 h-4 text-muted-foreground/30 shrink-0 self-center group-hover:text-muted-foreground/60 transition-colors" />
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
