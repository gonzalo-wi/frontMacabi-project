import { useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Crown, Loader2, Search, Trash2, UserPlus, Users, X } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { FeedbackBanner } from '@/components/FeedbackBanner'
import { useFeedback } from '@/hooks/useFeedback'
import { ActionButton, ActionIconButton } from '@/components/ActionButton'
import { PaginationControls } from '@/components/data/PaginationControls'
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { labelProjectRole } from '@/features/events/lib/eventLabels'
import {
  addProjectMember,
  listProjectMembers,
  removeProjectMember,
} from '@/features/projects/api/projectsApi'
import { fetchAllUsersForAdmin } from '@/features/projects/lib/projectAdminQueries'
import type { UserDTO } from '@/lib/api/types'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'

// ── Helpers ────────────────────────────────────────────────────

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')
}

function memberBorderClass(role: string) {
  return role === 'coordinator' ? 'border-l-primary' : 'border-l-border/40'
}

function avatarClass(role: string) {
  return role === 'coordinator'
    ? 'bg-primary/15 text-primary'
    : 'bg-muted text-muted-foreground'
}

function roleBadgeClass(role: string) {
  return role === 'coordinator'
    ? 'bg-primary/8 text-primary border-primary/20'
    : 'bg-muted/60 text-muted-foreground border-border/60'
}

// ── Page ───────────────────────────────────────────────────────

export default function ProyectoMiembrosPage() {
  const { id: projectId } = useParams<{ id: string }>()
  const { token, isRestoring } = useAuth()
  const qc = useQueryClient()
  const [pickUser, setPickUser] = useState('')
  const [pickRole, setPickRole] = useState('madrij')
  const { feedback, setFeedback } = useFeedback()

  const [userSearch, setUserSearch] = useState('')

  const membersQ = useQuery({
    queryKey: ['project-members', projectId, token],
    enabled: Boolean(token && projectId) && !isRestoring,
    queryFn: () => listProjectMembers(token!, projectId!),
  })

  const usersQ = useQuery({
    queryKey: ['admin-users-all', token],
    enabled: Boolean(token) && !isRestoring,
    queryFn: () => fetchAllUsersForAdmin(token!),
  })

  const userById = useMemo(() => {
    const m = new Map<string, UserDTO>()
    for (const u of usersQ.data ?? []) m.set(u.id, u)
    return m
  }, [usersQ.data])

  const filteredUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase()
    const all = usersQ.data ?? []
    if (!q) return all.slice(0, 50)
    return all
      .filter(
        (u) =>
          u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q),
      )
      .slice(0, 40)
  }, [usersQ.data, userSearch])

  // Sort members: coordinators first, then alphabetically
  const sortedMembers = useMemo(() => {
    const members = membersQ.data?.data ?? []
    return [...members].sort((a, b) => {
      if (a.role === 'coordinator' && b.role !== 'coordinator') return -1
      if (a.role !== 'coordinator' && b.role === 'coordinator') return 1
      const nameA = userById.get(a.user_id)?.name ?? ''
      const nameB = userById.get(b.user_id)?.name ?? ''
      return nameA.localeCompare(nameB, 'es', { sensitivity: 'base' })
    })
  }, [membersQ.data, userById])

  const coordinatorCount = sortedMembers.filter((m) => m.role === 'coordinator').length

  const [memberPage, setMemberPage] = useState(1)
  const MEMBER_PAGE_SIZE = 10
  const memberTotalPages = Math.max(1, Math.ceil(sortedMembers.length / MEMBER_PAGE_SIZE))
  const pagedMembers = sortedMembers.slice((memberPage - 1) * MEMBER_PAGE_SIZE, memberPage * MEMBER_PAGE_SIZE)

  const addMem = useMutation({
    mutationFn: async () => {
      if (!pickUser || !projectId) throw new Error('Elegí un usuario')
      await addProjectMember(token!, projectId, { user_id: pickUser, role: pickRole })
    },
    onSuccess: async () => {
      setFeedback({ text: 'Miembro agregado.', variant: 'success' })
      setPickUser('')
      setUserSearch('')
      await qc.invalidateQueries({ queryKey: ['project-members', projectId] })
      await qc.invalidateQueries({ queryKey: ['user-projects-by-user', token] })
    },
    onError: (e) =>
      setFeedback({ text: e instanceof Error ? e.message : 'Error', variant: 'error' }),
  })

  const remMem = useMutation({
    mutationFn: async (userId: string) => {
      if (!projectId) return
      await removeProjectMember(token!, projectId, userId)
    },
    onSuccess: async () => {
      setFeedback({ text: 'Miembro quitado.', variant: 'success' })
      await qc.invalidateQueries({ queryKey: ['project-members', projectId] })
      await qc.invalidateQueries({ queryKey: ['user-projects-by-user', token] })
    },
    onError: (e) =>
      setFeedback({ text: e instanceof Error ? e.message : 'Error', variant: 'error' }),
  })

  if (!projectId) return null

  const pickedUserLabel = pickUser ? userById.get(pickUser) : undefined
  const memberCount = sortedMembers.length

  return (
    <div className="space-y-4 sm:space-y-6">
      {feedback && <FeedbackBanner message={feedback.text} variant={feedback.variant} />}

      {/* ── Agregar miembro ── */}
      <Card className="rounded-2xl shadow-sm overflow-hidden">
        <CardHeader className="px-4 sm:px-6 pt-4 sm:pt-5 pb-3">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 shrink-0">
              <UserPlus className="h-4 w-4 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base font-bold">Agregar miembro</CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Buscá por nombre o correo y asignale un rol al proyecto.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 px-4 sm:px-6 pb-5">
          {/* ── Paso 1: buscar / seleccionar ── */}
          {!pickUser ? (
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Buscar persona
              </Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <Input
                  placeholder="Nombre o correo…"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="h-10 pl-9 bg-muted/30 border-border/60 focus:bg-background"
                />
              </div>

              {/* Results dropdown */}
              <div className="max-h-52 overflow-y-auto rounded-xl border border-border/60 bg-background shadow-sm divide-y divide-border/50">
                {usersQ.isLoading ? (
                  <p className="flex items-center gap-2 px-4 py-3 text-sm text-muted-foreground">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Cargando usuarios…
                  </p>
                ) : filteredUsers.length === 0 ? (
                  <p className="px-4 py-3 text-sm text-muted-foreground">Sin resultados.</p>
                ) : (
                  filteredUsers.map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      className="w-full text-left px-3 py-2.5 flex items-center gap-2.5 hover:bg-muted/50 transition-colors"
                      onClick={() => {
                        setPickUser(u.id)
                        setFeedback(null)
                      }}
                    >
                      <div className="h-7 w-7 shrink-0 rounded-full bg-muted flex items-center justify-center text-[11px] font-bold select-none text-muted-foreground">
                        {getInitials(u.name) || '?'}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground truncate">{u.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          ) : (
            /* ── Paso 2: confirmación + rol ── */
            <div className="space-y-4">
              {/* Selected user chip */}
              <div>
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 block">
                  Persona seleccionada
                </Label>
                <div className="flex items-center gap-3 rounded-xl border border-primary/25 bg-primary/5 px-3 py-2.5">
                  <div className="h-9 w-9 shrink-0 rounded-full bg-primary/15 flex items-center justify-center text-xs font-bold text-primary select-none">
                    {getInitials(pickedUserLabel?.name ?? '') || '?'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground leading-tight">
                      {pickedUserLabel?.name}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{pickedUserLabel?.email}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setPickUser(''); setUserSearch('') }}
                    className="shrink-0 p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    title="Cambiar persona"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Role + button */}
              <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
                <div className="flex-1 space-y-1.5">
                  <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Rol en el proyecto
                  </Label>
                  <Select value={pickRole} onValueChange={setPickRole}>
                    <SelectTrigger className="h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="coordinator">{labelProjectRole('coordinator')}</SelectItem>
                      <SelectItem value="madrij">{labelProjectRole('madrij')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <ActionButton
                  intent="primary"
                  className="h-10 shrink-0"
                  disabled={addMem.isPending}
                  onClick={() => {
                    setFeedback(null)
                    addMem.mutate()
                  }}
                >
                  {addMem.isPending
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <UserPlus className="w-4 h-4" />}
                  Agregar
                </ActionButton>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Lista de miembros ── */}
      <Card className="rounded-2xl shadow-sm overflow-hidden">
        <CardHeader className="px-4 sm:px-6 pt-4 sm:pt-5 pb-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-primary shrink-0" />
              <CardTitle className="text-base font-bold">Equipo</CardTitle>
            </div>
            {!membersQ.isLoading && memberCount > 0 && (
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
          {/* Skeleton */}
          {membersQ.isLoading && (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="h-[60px] rounded-xl bg-muted/40 animate-pulse"
                  style={{ opacity: 1 - i * 0.25 }}
                />
              ))}
            </div>
          )}

          {/* Empty */}
          {!membersQ.isLoading && memberCount === 0 && (
            <div className="flex flex-col items-center gap-2.5 py-10 text-center border border-dashed rounded-xl">
              <Users className="w-9 h-9 text-muted-foreground/25" />
              <p className="text-sm text-muted-foreground">
                Este proyecto no tiene miembros todavía.
              </p>
            </div>
          )}

          {/* Member list */}
          {!membersQ.isLoading && memberCount > 0 && (
            <div className="space-y-2">
              {pagedMembers.map((m) => {
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
                    {/* Avatar */}
                    <div
                      className={cn(
                        'h-9 w-9 shrink-0 rounded-full flex items-center justify-center text-xs font-bold select-none',
                        avatarClass(m.role),
                      )}
                    >
                      {initials}
                    </div>

                    {/* Info */}
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

                    {/* Role badge */}
                    <Badge
                      variant="outline"
                      className={cn(
                        'text-[10px] font-semibold shrink-0',
                        roleBadgeClass(m.role),
                      )}
                    >
                      {labelProjectRole(m.role)}
                    </Badge>

                    {/* Delete */}
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
          <PaginationControls page={memberPage} totalPages={memberTotalPages} onPageChange={setMemberPage} />
        </CardContent>
      </Card>
    </div>
  )
}
