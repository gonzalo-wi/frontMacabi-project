import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'

import { FeedbackBanner } from '@/components/FeedbackBanner'
import {
  Card,
  CardContent,
} from '@/components/ui/card'
import { ProjectMetaForm } from '@/features/projects/components/ProjectMetaForm'
import { getProject } from '@/features/projects/api/projectsApi'
import { ApiError } from '@/lib/api/apiClient'
import { useAuth } from '@/hooks/useAuth'
import { useState } from 'react'

export default function ProyectoResumenPage() {
  const { id: projectId } = useParams<{ id: string }>()
  const { token, isRestoring } = useAuth()
  const [feedback, setFeedback] = useState<{
    text: string
    variant: 'success' | 'error' | 'info'
  } | null>(null)

  const projectQ = useQuery({
    queryKey: ['project', projectId, token],
    enabled: Boolean(token && projectId) && !isRestoring,
    queryFn: () => getProject(token!, projectId!),
  })

  if (!projectId) return null

  return (
    <div className="space-y-6">
      {projectQ.isError && (
        <p className="text-sm text-destructive">
          {projectQ.error instanceof ApiError ? projectQ.error.message : 'Error'}
        </p>
      )}
      {feedback && <FeedbackBanner message={feedback.text} variant={feedback.variant} />}

      {projectQ.data && (
        <ProjectMetaForm
          key={`${projectQ.data.id}-${projectQ.data.name}-${projectQ.data.description}`}
          project={projectQ.data}
          token={token!}
          projectId={projectId}
          onFeedback={setFeedback}
        />
      )}

      <Card className="border-dashed bg-muted/15">
        <CardContent className="py-4 text-xs text-muted-foreground leading-snug">
          Esta pantalla concentra la configuración del proyecto. Para operación diaria usá las pestañas superiores:
          miembros, gastos, jornadas y pedidos de stock.
        </CardContent>
      </Card>
    </div>
  )
}
