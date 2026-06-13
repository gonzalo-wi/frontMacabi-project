import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Info } from 'lucide-react'

import { Card, CardContent } from '@/components/ui/card'
import { ProjectMetaForm } from '@/features/projects/components/ProjectMetaForm'
import { getProject } from '@/features/projects/api/projectsApi'
import { ApiError } from '@/lib/api/apiClient'
import { useAuth } from '@/hooks/useAuth'

export default function ProyectoResumenPage() {
  const { id: projectId } = useParams<{ id: string }>()
  const { token, isRestoring } = useAuth()

  const projectQ = useQuery({
    queryKey: ['project', projectId, token],
    enabled: Boolean(token && projectId) && !isRestoring,
    queryFn: () => getProject(token!, projectId!),
  })

  if (!projectId) return null

  return (
    <div className="space-y-4 sm:space-y-6">
      {projectQ.isError && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {projectQ.error instanceof ApiError ? projectQ.error.message : 'Error al cargar el proyecto'}
        </div>
      )}
      {projectQ.data && (
        <ProjectMetaForm
          key={`${projectQ.data.id}-${projectQ.data.name}-${projectQ.data.description}`}
          project={projectQ.data}
          token={token!}
          projectId={projectId}
        />
      )}

      <Card className="border border-dashed rounded-2xl bg-muted/10">
        <CardContent className="py-3.5 px-4">
          <div className="flex gap-3 text-xs text-muted-foreground leading-relaxed">
            <Info className="h-4 w-4 shrink-0 mt-0.5 text-muted-foreground/50" />
            <p>
              Esta pantalla concentra la{' '}
              <strong className="font-semibold text-foreground/60">configuración</strong> del
              proyecto. Para la operación diaria usá las pestañas:{' '}
              <em>Miembros, Gastos, Jornadas</em> y <em>Materiales</em>.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
