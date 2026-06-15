import { useMemo, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { updateProject } from '@/features/projects/api/projectsApi'
import type { ProjectDTO } from '@/features/projects/model/types'
import { queryKeys } from '@/lib/queryKeys'

export function ProjectMetaForm({
  project,
  token,
  projectId,
}: {
  project: ProjectDTO
  token: string
  projectId: string
}) {
  const qc = useQueryClient()
  const [editName, setEditName] = useState(project.name)
  const [editDescription, setEditDescription] = useState(project.description ?? '')

  const projectDirty = useMemo(
    () =>
      editName.trim() !== project.name.trim() ||
      (editDescription.trim() || '') !== (project.description ?? '').trim(),
    [editDescription, editName, project.description, project.name],
  )

  const saveProject = useMutation({
    mutationFn: async () => {
      if (!editName.trim()) throw new Error('Nombre requerido')
      await updateProject(token, projectId, {
        name: editName.trim(),
        description: editDescription.trim() || '',
      })
    },
    onSuccess: async () => {
      toast.success('Datos del proyecto guardados.')
      await qc.invalidateQueries({ queryKey: queryKeys.projects.detail(projectId, token) })
      await qc.invalidateQueries({ queryKey: queryKeys.projects.adminListRoot() })
      await qc.invalidateQueries({ queryKey: queryKeys.projects.allP1Root() })
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Error'),
  })

  return (
    <Card>
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle className="text-base">Datos del proyecto</CardTitle>
          <CardDescription>Nombre y descripción visibles en listados.</CardDescription>
        </div>
        {projectDirty && (
          <span className="text-xs font-medium text-amber-800 dark:text-amber-200 shrink-0">
            Cambios sin guardar
          </span>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="proj-name">Nombre</Label>
          <Input
            id="proj-name"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            className="h-11"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="proj-desc">Descripción</Label>
          <Textarea
            id="proj-desc"
            value={editDescription}
            onChange={(e) => setEditDescription(e.target.value)}
            rows={3}
          />
        </div>
        <Button
          disabled={saveProject.isPending || !projectDirty}
          onClick={() => saveProject.mutate()}
        >
          {saveProject.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Guardar proyecto'}
        </Button>
      </CardContent>
    </Card>
  )
}
