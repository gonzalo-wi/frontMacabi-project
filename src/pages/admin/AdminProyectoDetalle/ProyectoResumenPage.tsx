import { useParams } from 'react-router-dom'
import { Info } from 'lucide-react'

import { Card, CardContent } from '@/components/ui/card'
import { ProjectMetaForm } from '@/features/projects/components/ProjectMetaForm'
import { useProject } from '@/features/projects/hooks/useProject'
import { useAuth } from '@/hooks/useAuth'

export default function ProyectoResumenPage() {
  const { id: projectId } = useParams<{ id: string }>()
  const { token, isRestoring } = useAuth()

  const projectQ = useProject(token, projectId, isRestoring)

  if (!projectId) return null

  return (
    <div className="space-y-4 sm:space-y-6">
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
              <em>Miembros, Materiales, Gastos</em> y <em>Jornadas</em>.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
