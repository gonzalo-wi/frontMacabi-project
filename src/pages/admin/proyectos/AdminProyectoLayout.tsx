import { Link, Outlet, useNavigate, useParams, useLocation } from 'react-router-dom'
import { FolderKanban } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'

import { PageHeader } from '@/components/PageHeader'
import { ActionButton } from '@/components/ActionButton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { getProject } from '@/features/projects/api/projectsApi'
import { ApiError } from '@/lib/api/apiClient'
import { useAuth } from '@/hooks/useAuth'

const SECTIONS = [
  { path: 'resumen', label: 'Resumen' },
  { path: 'miembros', label: 'Miembros' },
  { path: 'gastos', label: 'Gastos' },
  { path: 'jornadas', label: 'Jornadas' },
  { path: 'recursos', label: 'Pedidos de stock' },
] as const

function tabFromPath(pathname: string): (typeof SECTIONS)[number]['path'] {
  const last = pathname.split('/').filter(Boolean).pop()
  const hit = SECTIONS.find((s) => s.path === last)
  return hit?.path ?? 'resumen'
}

export default function AdminProyectoLayout() {
  const { id } = useParams<{ id: string }>()
  const { token, isRestoring } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const activeTab = tabFromPath(location.pathname)

  const projectQ = useQuery({
    queryKey: ['project', id, token],
    enabled: Boolean(token && id) && !isRestoring,
    queryFn: () => getProject(token!, id!),
  })

  const titleLoading = Boolean(id && token && !isRestoring && projectQ.isLoading && !projectQ.data)

  if (!id) return null

  return (
    <div className="min-h-screen pb-24">
      <PageHeader
        icon={FolderKanban}
        title={
          titleLoading ? (
            <span className="inline-block h-7 w-48 max-w-[min(48ch,72vw)] rounded-md bg-white/15 lg:bg-muted animate-pulse" />
          ) : (
            projectQ.data?.name ?? 'Proyecto'
          )
        }
        subtitle="Vista de gestión: equipo, gastos, jornadas y pedidos de stock."
        action={
          <ActionButton intent="back" asChild>
            <Link to="/app/admin/proyectos">Todos los proyectos</Link>
          </ActionButton>
        }
      />

      <div className="border-b bg-muted/30 px-4 lg:px-6">
        <div className="max-w-4xl mx-auto py-3">
          <Tabs
            value={activeTab}
            onValueChange={(v) => navigate(`/app/admin/proyectos/${id}/${v}`)}
            className="gap-0"
          >
            <TabsList
              className="h-auto w-full flex-wrap justify-start gap-1 bg-muted/50 p-1"
              aria-label="Secciones del proyecto"
            >
              {SECTIONS.map((s) => (
                <TabsTrigger key={s.path} value={s.path} className="text-xs sm:text-sm">
                  {s.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
      </div>

      <div className="p-4 lg:p-6 max-w-4xl mx-auto">
        {projectQ.isError && (
          <p className="text-sm text-destructive mb-4">
            {projectQ.error instanceof ApiError ? projectQ.error.message : 'Error al cargar el proyecto'}
          </p>
        )}
        <Outlet />
      </div>
    </div>
  )
}
