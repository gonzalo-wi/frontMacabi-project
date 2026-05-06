import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { AlertCircle, ChevronRight, FolderOpen, Calendar, Users, CheckCircle2 } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { listProjects } from '@/lib/api/projects'
import { getAttendanceCount, confirmAttendance } from '@/lib/api/attendance'
import { ApiError } from '@/lib/api/apiClient'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'

const PROJECT_COLORS = [
  { bg: 'from-blue-500 to-indigo-600',    badge: 'bg-blue-100 text-blue-800'   },
  { bg: 'from-emerald-500 to-teal-600',   badge: 'bg-emerald-100 text-emerald-800' },
  { bg: 'from-violet-500 to-purple-600',  badge: 'bg-violet-100 text-violet-800'  },
  { bg: 'from-amber-500 to-orange-500',   badge: 'bg-amber-100 text-amber-800'   },
  { bg: 'from-rose-500 to-pink-600',      badge: 'bg-rose-100 text-rose-800'    },
  { bg: 'from-cyan-500 to-sky-600',       badge: 'bg-cyan-100 text-cyan-800'    },
]

function getInitials(name: string) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

function formatDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })
}

function ProjectCardSkeleton() {
  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden animate-pulse">
      <div className="h-1.5 w-full bg-muted" />
      <div className="p-5 space-y-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-muted flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-muted rounded-lg w-2/3" />
            <div className="h-3 bg-muted rounded-lg w-1/2" />
          </div>
        </div>
        <div className="h-3 bg-muted rounded-lg w-1/3" />
        <div className="h-10 bg-muted rounded-xl" />
      </div>
    </div>
  )
}

function AttendanceSection({ projectId, token }: { projectId: string; token: string }) {
  const queryClient = useQueryClient()

  const attendanceQuery = useQuery({
    queryKey: ['attendance', projectId],
    queryFn: () => getAttendanceCount(token, projectId),
  })

  const confirmMutation = useMutation({
    mutationFn: () => confirmAttendance(token, projectId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance', projectId] })
    },
  })

  const data = attendanceQuery.data
  const userConfirmed = confirmMutation.isSuccess

  return (
    <div className="space-y-2">
      {data && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Users className="w-3.5 h-3.5" />
          <span>{data.confirmed} confirmado{data.confirmed !== 1 ? 's' : ''}</span>
        </div>
      )}

      {userConfirmed ? (
        <div className="flex items-center gap-2 text-xs text-success bg-success/8 border border-success/25 rounded-xl px-3 py-2">
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
          <span className="font-semibold">¡Asistencia confirmada!</span>
        </div>
      ) : (
        <Button
          size="sm"
          variant="outline"
          className="w-full text-xs"
          disabled={confirmMutation.isPending}
          onClick={() => confirmMutation.mutate()}
        >
          {confirmMutation.isPending ? 'Confirmando...' : 'Confirmar asistencia'}
        </Button>
      )}
    </div>
  )
}

export default function ProyectosUsuarioPage() {
  const { token, isRestoring } = useAuth()
  const navigate = useNavigate()

  const projectsQuery = useQuery({
    queryKey: ['projects'],
    queryFn: () => listProjects(token!, 1, 100),
    enabled: Boolean(token) && !isRestoring,
  })

  const projects = projectsQuery.data?.data ?? []

  return (
    <div className="min-h-screen">
      <PageHeader
        icon={FolderOpen}
        title="Proyectos"
        subtitle="Elegí el proyecto en el que vas a comer"
      />

      <div className="p-4 lg:p-6 max-w-3xl mx-auto">

        {/* Skeletons */}
        {projectsQuery.isLoading && (
          <div className="grid gap-4 sm:grid-cols-2">
            {[0, 1, 2].map(i => <ProjectCardSkeleton key={i} />)}
          </div>
        )}

        {/* Error */}
        {projectsQuery.isError && !projectsQuery.isLoading && (
          <div className="flex items-center justify-center gap-2 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-2xl px-5 py-10">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {projectsQuery.error instanceof ApiError
              ? projectsQuery.error.message
              : 'No se pudieron cargar los proyectos.'}
          </div>
        )}

        {/* Empty */}
        {!projectsQuery.isLoading && !projectsQuery.isError && projects.length === 0 && (
          <div className="text-center py-20 border-2 border-dashed border-border rounded-2xl">
            <FolderOpen className="w-12 h-12 mx-auto text-muted-foreground/20 mb-4" />
            <p className="font-semibold text-foreground">Sin proyectos disponibles</p>
            <p className="text-sm text-muted-foreground mt-1">No hay proyectos activos por ahora.</p>
          </div>
        )}

        {/* Grid de proyectos */}
        {!projectsQuery.isLoading && projects.length > 0 && (
          <>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-4">
              {projects.length} {projects.length === 1 ? 'proyecto disponible' : 'proyectos disponibles'}
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              {projects.map((project, i) => {
                const color = PROJECT_COLORS[i % PROJECT_COLORS.length]
                return (
                  <div
                    key={project.id}
                    className="group rounded-2xl border border-border bg-card overflow-hidden shadow-sm hover:shadow-md hover:border-transparent transition-all duration-200 flex flex-col"
                  >
                    <div className={`h-1.5 w-full bg-gradient-to-r ${color.bg}`} />

                    <div className="p-5 flex flex-col flex-1 gap-4">
                      {/* Cabecera */}
                      <div className="flex items-start gap-3">
                        <div
                          className={`flex-shrink-0 w-12 h-12 rounded-2xl bg-gradient-to-br ${color.bg} flex items-center justify-center shadow-sm`}
                        >
                          <span className="text-white font-black text-base leading-none">
                            {getInitials(project.name)}
                          </span>
                        </div>
                        <div className="min-w-0 flex-1 pt-0.5">
                          <h2 className="font-bold text-base text-foreground leading-snug line-clamp-2">
                            {project.name}
                          </h2>
                          {project.description ? (
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2 leading-snug">
                              {project.description}
                            </p>
                          ) : (
                            <p className="text-sm text-muted-foreground/50 mt-1 italic">Sin descripción</p>
                          )}
                        </div>
                      </div>

                      {/* Fecha de creación */}
                      {project.created_at && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Calendar className="w-3.5 h-3.5" />
                          Activo desde {formatDate(project.created_at)}
                        </div>
                      )}

                      {/* Attendance */}
                      {token && (
                        <AttendanceSection projectId={project.id} token={token} />
                      )}

                      {/* CTA */}
                      <button
                        type="button"
                        onClick={() => navigate(`/app/comidas/${project.id}`)}
                        className={`mt-auto w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r ${color.bg} text-white shadow-sm hover:opacity-90 hover:shadow-md active:scale-[0.98] transition-all duration-150`}
                      >
                        Ver comidas
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}