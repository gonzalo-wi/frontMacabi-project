import { useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Loader2, Search, Trash2 } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { FeedbackBanner } from '@/components/FeedbackBanner'
import { ActionButton, ActionIconButton } from '@/components/ActionButton'
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

export default function ProyectoMiembrosPage() {
  const { id: projectId } = useParams<{ id: string }>()
  const { token, isRestoring } = useAuth()
  const qc = useQueryClient()
  const [pickUser, setPickUser] = useState('')
  const [pickRole, setPickRole] = useState('madrij')
  const [feedback, setFeedback] = useState<{
    text: string
    variant: 'success' | 'error' | 'info'
  } | null>(null)
  const [userSearch, setUserSearch] = useState('')

  const membersQ = useQuery({
    queryKey: ['project-members', projectId, token],
    enabled: Boolean(token && projectId) && !isRestoring,
    queryFn: () => listProjectMembers(token!, projectId!),
  })

  const usersQ = useQuery({
    queryKey: ['users-all-admin', token],
    enabled: Boolean(token) && !isRestoring,
    queryFn: () => fetchAllUsersForAdmin(token!),
  })

  const userById = useMemo(() => {
    const m = new Map<string, UserDTO>()
    for (const u of usersQ.data ?? []) {
      m.set(u.id, u)
    }
    return m
  }, [usersQ.data])

  const filteredUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase()
    const all = usersQ.data ?? []
    if (!q) return all.slice(0, 50)
    return all
      .filter(
        (u) =>
          u.name.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q),
      )
      .slice(0, 40)
  }, [usersQ.data, userSearch])

  const addMem = useMutation({
    mutationFn: async () => {
      if (!pickUser || !projectId) throw new Error('Elegí usuario')
      await addProjectMember(token!, projectId, { user_id: pickUser, role: pickRole })
    },
    onSuccess: async () => {
      setFeedback({ text: 'Miembro agregado.', variant: 'success' })
      setPickUser('')
      await qc.invalidateQueries({ queryKey: ['project-members', projectId] })
      await qc.invalidateQueries({ queryKey: ['user-projects-by-user', token] })
    },
    onError: (e) =>
      setFeedback({
        text: e instanceof Error ? e.message : 'Error',
        variant: 'error',
      }),
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
      setFeedback({
        text: e instanceof Error ? e.message : 'Error',
        variant: 'error',
      }),
  })

  if (!projectId) return null

  const pickedUserLabel = pickUser ? userById.get(pickUser) : undefined

  return (
    <div className="space-y-6">
      {feedback && <FeedbackBanner message={feedback.text} variant={feedback.variant} />}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Miembros del proyecto</CardTitle>
          <CardDescription>
            Buscá por nombre o correo para agregar una persona al proyecto.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Buscar persona</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Nombre o email…"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="h-11 pl-9"
              />
            </div>
            <div className="max-h-48 overflow-y-auto rounded-md border bg-background">
              {usersQ.isLoading ? (
                <p className="text-sm text-muted-foreground p-3">Cargando usuarios…</p>
              ) : filteredUsers.length === 0 ? (
                <p className="text-sm text-muted-foreground p-3">Sin resultados.</p>
              ) : (
                <ul className="divide-y">
                  {filteredUsers.map((u) => (
                    <li key={u.id}>
                      <button
                        type="button"
                        className={cn(
                          'w-full text-left px-3 py-2 text-sm hover:bg-muted/60 transition-colors',
                          pickUser === u.id && 'bg-primary/10',
                        )}
                        onClick={() => {
                          setPickUser(u.id)
                          setFeedback(null)
                        }}
                      >
                        <span className="font-medium">{u.name}</span>
                        <span className="text-muted-foreground"> — {u.email}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {pickUser && pickedUserLabel && (
              <p className="text-xs text-muted-foreground">
                Seleccionado:{' '}
                <span className="text-foreground font-medium">
                  {pickedUserLabel.name} · {pickedUserLabel.email}
                </span>
              </p>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
            <div className="flex-1 space-y-1.5">
              <Label>Rol</Label>
              <Select value={pickRole} onValueChange={setPickRole}>
                <SelectTrigger className="h-11">
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
              className="h-11"
              disabled={addMem.isPending || !pickUser}
              onClick={() => {
                setFeedback(null)
                addMem.mutate()
              }}
            >
              {addMem.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Agregar'}
            </ActionButton>
          </div>

          <div className="rounded-md border overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-left">
                  <th className="px-3 py-2 font-medium">Usuario</th>
                  <th className="px-3 py-2 font-medium">Rol</th>
                  <th className="px-3 py-2 w-12" />
                </tr>
              </thead>
              <tbody>
                {membersQ.isLoading && (
                  <>
                    {[0, 1].map((i) => (
                      <tr key={i} className="border-b last:border-0">
                        <td className="px-3 py-2">
                          <div className="h-4 bg-muted/50 rounded animate-pulse w-48" />
                        </td>
                        <td className="px-3 py-2">
                          <div className="h-4 bg-muted/50 rounded animate-pulse w-20" />
                        </td>
                        <td className="px-3 py-2" />
                      </tr>
                    ))}
                  </>
                )}
                {!membersQ.isLoading && (membersQ.data?.data.length ?? 0) === 0 && (
                  <tr>
                    <td colSpan={3} className="px-3 py-4 text-center text-sm text-muted-foreground">
                      Este proyecto no tiene miembros todavía.
                    </td>
                  </tr>
                )}
                {membersQ.data?.data.map((m) => {
                  const u = userById.get(m.user_id)
                  return (
                    <tr key={m.id} className="border-b last:border-0">
                      <td className="px-3 py-2">
                        {u ? `${u.name} · ${u.email}` : m.user_id}
                      </td>
                      <td className="px-3 py-2">{labelProjectRole(m.role)}</td>
                      <td className="px-3 py-2">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <ActionIconButton intent="delete" label="Quitar miembro">
                              <Trash2 className="w-4 h-4" />
                            </ActionIconButton>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>¿Quitar esta persona?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Dejará de figurar como miembro del proyecto.
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
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
