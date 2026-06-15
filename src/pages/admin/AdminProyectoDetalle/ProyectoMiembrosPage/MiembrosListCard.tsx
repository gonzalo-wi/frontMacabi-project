import { useMemo } from 'react'
import { Crown, Trash2, Users } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'

import { toast } from 'sonner'
import { ActionIconButton } from '@/components/ActionButton'
import { PaginationControls } from '@/components/data/PaginationControls'
import { SkeletonRows } from '@/components/data/SkeletonRows'
import { useClientPagination } from '@/hooks/useClientPagination'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { labelProjectRole } from '@/features/events/lib/eventLabels'
import { removeProjectMember } from '@/features/projects/api/projectsApi'
import {
  memberAvatarClass,
  memberBorderClass,
  roleBadgeClass,
} from '@/features/projects/lib/projectHelpers'
import type { UserDTO } from '@/lib/api/types'
import { cn, getInitials } from '@/lib/utils'

type ProjectMember = { id: string; user_id: string; role: string }

/** Card "Equipo": lista de miembros (coordinadores primero), paginada, con quitar. */
export function MiembrosListCard({
  token,
  projectId,
  members,
  userById,
  isLoading,
}: {
  token: string
  projectId: string
  members: ProjectMember[]
  userById: Map<string, UserDTO>
  isLoading: boolean
}) {
  const qc = useQueryClient()

  const sortedMembers = useMemo(() => {
    return [...members].sort((a, b) => {
      if (a.role === 'coordinator' && b.role !== 'coordinator') return -1
      if (a.role !== 'coordinator' && b.role === 'coordinator') return 1
      const nameA = userById.get(a.user_id)?.name ?? ''
      const nameB = userById.get(b.user_id)?.name ?? ''
      return nameA.localeCompare(nameB, 'es', { sensitivity: 'base' })
    })
  }, [members, userById])

  const memberCount = sortedMembers.length
  const coordinatorCount = sortedMembers.filter((m) => m.role === 'coordinator').length

  const { page, setPage, totalPages, pageItems } = useClientPagination(sortedMembers)

  const remMem = useMutation({
    mutationFn: async (userId: string) => {
      await removeProjectMember(token, projectId, userId)
    },
    onSuccess: async () => {
      toast.success('Miembro quitado.')
      await qc.invalidateQueries({ queryKey: ['project-members', projectId] })
      await qc.invalidateQueries({ queryKey: ['user-projects-by-user', token] })
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Error'),
  })

  return (
    <Card className="rounded-2xl shadow-sm overflow-hidden">
      <CardHeader className="px-4 sm:px-6 pt-4 sm:pt-5 pb-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-primary shrink-0" />
            <CardTitle className="text-base font-bold">Equipo</CardTitle>
          </div>
          {!isLoading && memberCount > 0 && (
            <div className="flex items-center gap-1.5">
              {coordinatorCount > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/5 px-2 py-0.5 text-[10px] font-semibold text-primary">
                  <Crown className="w-2.5 h-2.5" />
                  {coordinatorCount}
                </span>
              )}
              <span className="inline-flex items-center rounded-full border border-border bg-muted/40 px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground tabular-nums">
                {memberCount} miembro{memberCount !== 1 ? 's' : ''}
              </span>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="px-4 sm:px-6 pb-5">
        {isLoading && <SkeletonRows count={3} className="h-[60px]" />}

        {!isLoading && memberCount === 0 && (
          <div className="flex flex-col items-center gap-2.5 py-10 text-center border border-dashed rounded-xl">
            <Users className="w-9 h-9 text-muted-foreground/25" />
            <p className="text-sm text-muted-foreground">
              Este proyecto no tiene miembros todavía.
            </p>
          </div>
        )}

        {!isLoading && memberCount > 0 && (
          <div className="space-y-2">
            {pageItems.map((m) => {
              const u = userById.get(m.user_id)
              const displayName = u?.name?.trim() || m.user_id.slice(0, 8) + '…'
              const initials = getInitials(displayName) || '?'
              const isCoord = m.role === 'coordinator'

              return (
                <div
                  key={m.id}
                  className={cn(
                    'flex items-center gap-3 rounded-xl border border-border/70 bg-card pl-3.5 pr-3 py-2.5 border-l-[3px] hover:bg-muted/20 transition-colors',
                    memberBorderClass(m.role),
                  )}
                >
                  <div
                    className={cn(
                      'h-9 w-9 shrink-0 rounded-full flex items-center justify-center text-xs font-bold select-none',
                      memberAvatarClass(m.role),
                    )}
                  >
                    {initials}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <p className="text-sm font-semibold text-foreground leading-tight truncate">
                        {displayName}
                      </p>
                      {isCoord && (
                        <Crown className="w-3 h-3 text-primary shrink-0" aria-label="Coordinador" />
                      )}
                    </div>
                    {u?.email && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{u.email}</p>
                    )}
                  </div>

                  <Badge
                    variant="outline"
                    className={cn('text-[10px] font-semibold shrink-0', roleBadgeClass(m.role))}
                  >
                    {labelProjectRole(m.role)}
                  </Badge>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <ActionIconButton intent="delete" label={`Quitar a ${displayName}`}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </ActionIconButton>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>¿Quitar a {displayName}?</AlertDialogTitle>
                        <AlertDialogDescription>
                          {displayName} dejará de figurar como miembro de este proyecto.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => remMem.mutate(m.user_id)}>
                          Quitar
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              )
            })}
          </div>
        )}
        <PaginationControls page={page} totalPages={totalPages} onPageChange={setPage} />
      </CardContent>
    </Card>
  )
}
