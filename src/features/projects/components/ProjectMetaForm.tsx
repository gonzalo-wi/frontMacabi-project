import { useMemo, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { updateProject } from '@/features/projects/api/projectsApi'
import type { ProjectDTO } from '@/features/projects/model/types'

export function ProjectMetaForm({
  project,
  token,
  projectId,
  onFeedback,
}: {
  project: ProjectDTO
  token: string
  projectId: string
  onFeedback: (next: { text: string; variant: 'success' | 'error' | 'info' } | null) => void
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
      onFeedback({ text: 'Datos del proyecto guardados.', variant: 'success' })
      await qc.invalidateQueries({ queryKey: ['project', projectId, token] })
      await qc.invalidateQueries({ queryKey: ['admin-projects-all'] })
      await qc.invalidateQueries({ queryKey: ['projects-all-p1'] })
    },
    onError: (e) =>
      onFeedback({
        text: e instanceof Error ? e.message : 'Error',
        variant: 'error',
      }),
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
          onClick={() => {
            onFeedback(null)
            saveProject.mutate()
          }}
        >
          {saveProject.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Guardar proyecto'}
        </Button>
      </CardContent>
    </Card>
  )
}
