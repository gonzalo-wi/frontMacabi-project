import { Link, useParams } from 'react-router-dom'
import { ArrowRight, CalendarDays, Receipt, Users } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'

import { FeedbackBanner } from '@/components/FeedbackBanner'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { ProjectMetaForm } from '@/features/projects/components/ProjectMetaForm'
import { getProject, listProjectMembers } from '@/features/projects/api/projectsApi'
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

  const membersQ = useQuery({
    queryKey: ['project-members', projectId, token],
    enabled: Boolean(token && projectId) && !isRestoring,
    queryFn: () => listProjectMembers(token!, projectId!),
  })

  if (!projectId) return null

  const mc = membersQ.data?.data.length ?? 0

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

      <Card>
        <CardHeader className="pb-3 space-y-1">
          <CardTitle className="text-base">Secciones</CardTitle>
          <CardDescription>
            Usá las pestañas de arriba o estos accesos al detalle del proyecto.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2 pt-0">
          <Button variant="outline" size="sm" className="gap-2" asChild>
            <Link to="../miembros" relative="path">
              <Users className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              Miembros
              <span className="text-muted-foreground font-normal">
                {!membersQ.isLoading && ` (${mc})`}
              </span>
              <ArrowRight className="h-3.5 w-3.5 shrink-0 opacity-60 ml-0.5" aria-hidden />
            </Link>
          </Button>
          <Button variant="outline" size="sm" className="gap-2" asChild>
            <Link to="../gastos" relative="path">
              <Receipt className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              Gastos
              <ArrowRight className="h-3.5 w-3.5 shrink-0 opacity-60 ml-0.5" aria-hidden />
            </Link>
          </Button>
          <Button variant="outline" size="sm" className="gap-2" asChild>
            <Link to="../jornadas" relative="path">
              <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              Jornadas vinculadas
              <ArrowRight className="h-3.5 w-3.5 shrink-0 opacity-60 ml-0.5" aria-hidden />
            </Link>
          </Button>
        </CardContent>
      </Card>

      <Card className="border-dashed bg-muted/15">
        <CardContent className="py-4 text-xs text-muted-foreground leading-snug">
          En{' '}
          <strong className="text-foreground font-medium">Gastos</strong> cargás los movimientos y
          los períodos mensuales o trimestrales del proyecto.
        </CardContent>
      </Card>
    </div>
  )
}
