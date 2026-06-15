import { useMemo, useState } from 'react'
import { Loader2, Search, UserPlus, X } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'

import { toast } from 'sonner'
import { ActionButton } from '@/components/ActionButton'
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
import { labelProjectRole } from '@/features/projects/lib/projectLabels'
import { addProjectMember } from '@/features/projects/api/projectsApi'
import type { UserDTO } from '@/lib/api/types'
import { getInitials } from '@/lib/utils'
import { queryKeys } from '@/lib/queryKeys'

/** Card "Agregar miembro": busca un usuario, elige rol y lo agrega al proyecto. */
export function AgregarMiembroCard({
  token,
  projectId,
  users,
  usersLoading,
}: {
  token: string
  projectId: string
  users: UserDTO[]
  usersLoading: boolean
}) {
  const qc = useQueryClient()
  const [pickUser, setPickUser] = useState('')
  const [pickRole, setPickRole] = useState('madrij')
  const [userSearch, setUserSearch] = useState('')

  const filteredUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase()
    if (!q) return users.slice(0, 50)
    return users
      .filter((u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
      .slice(0, 40)
  }, [users, userSearch])

  const pickedUser = pickUser ? users.find((u) => u.id === pickUser) : undefined

  const addMem = useMutation({
    mutationFn: async () => {
      if (!pickUser) throw new Error('Elegí un usuario')
      await addProjectMember(token, projectId, { user_id: pickUser, role: pickRole })
    },
    onSuccess: async () => {
      toast.success('Miembro agregado.')
      setPickUser('')
      setUserSearch('')
      await qc.invalidateQueries({ queryKey: [...queryKeys.projects.membersRoot(), projectId] })
      await qc.invalidateQueries({ queryKey: queryKeys.users.byUserProjects(token) })
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Error'),
  })

  return (
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

            <div className="max-h-52 overflow-y-auto rounded-xl border border-border/60 bg-background shadow-sm divide-y divide-border/50">
              {usersLoading ? (
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
                    onClick={() => setPickUser(u.id)}
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
          <div className="space-y-4">
            <div>
              <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 block">
                Persona seleccionada
              </Label>
              <div className="flex items-center gap-3 rounded-xl border border-primary/25 bg-primary/5 px-3 py-2.5">
                <div className="h-9 w-9 shrink-0 rounded-full bg-primary/15 flex items-center justify-center text-xs font-bold text-primary select-none">
                  {getInitials(pickedUser?.name ?? '') || '?'}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground leading-tight">
                    {pickedUser?.name}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{pickedUser?.email}</p>
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
                onClick={() => addMem.mutate()}
              >
                {addMem.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                Agregar
              </ActionButton>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
