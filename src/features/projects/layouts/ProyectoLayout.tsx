import { useParams, useNavigate, useLocation, Link, Outlet } from 'react-router-dom'
import { FolderKanban } from 'lucide-react'

import { PageHeader } from '@/components/PageHeader'
import { ActionButton } from '@/components/ActionButton'
import { ErrorBanner } from '@/components/data/ErrorBanner'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useProject } from '@/features/projects/hooks/useProject'
import { ApiError } from '@/lib/api/apiClient'
import { useAuth } from '@/hooks/useAuth'

const SECTIONS = [
  { path: 'resumen', label: 'Resumen' },
  { path: 'miembros', label: 'Miembros' },
  { path: 'recursos', label: 'Materiales' },
  { path: 'gastos', label: 'Gastos' },
  { path: 'jornadas', label: 'Jornadas' },
] as const

function tabFromPath(pathname: string): (typeof SECTIONS)[number]['path'] {
  const last = pathname.split('/').filter(Boolean).pop()
  const hit = SECTIONS.find((s) => s.path === last)
  return hit?.path ?? 'resumen'
}

export default function ProyectoLayout() {
  const { id } = useParams<{ id: string }>()
  const { token, isRestoring } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const activeTab = tabFromPath(location.pathname)

  const projectQ = useProject(token, id, isRestoring)

  const titleLoading = Boolean(id && token && !isRestoring && projectQ.isLoading && !projectQ.data)

  if (!id) return null

  return (
    <div className="min-h-screen pb-24">
      <PageHeader
        icon={FolderKanban}
        title={
          titleLoading ? (
            <span className="inline-block h-5 w-48 max-w-[min(48ch,72vw)] rounded-md bg-white/15 lg:bg-muted animate-pulse" />
          ) : (
            projectQ.data?.name ?? 'Proyecto'
          )
        }
        subtitle="Equipo, materiales, gastos y jornadas."
        action={
          <ActionButton intent="back" asChild>
            <Link to="/app/admin/proyectos">Todos los proyectos</Link>
          </ActionButton>
        }
      />

      <div className="border-b bg-card/60 backdrop-blur-sm sticky top-[57px] lg:top-[53px] z-10">
        <div className="max-w-4xl mx-auto overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <Tabs
            value={activeTab}
            onValueChange={(v) => navigate(`/app/admin/proyectos/${id}/${v}`)}
            className="gap-0"
          >
            <TabsList className="inline-flex h-auto w-max min-w-full lg:min-w-0 bg-transparent p-0 gap-0 rounded-none px-3 sm:px-4 lg:px-6">
              {SECTIONS.map((s) => (
                <TabsTrigger
                  key={s.path}
                  value={s.path}
                  className={[
                    'relative h-11 shrink-0 flex-none px-3 sm:px-4 lg:px-5 rounded-none border-b-2 border-transparent',
                    'text-xs sm:text-sm font-medium text-muted-foreground whitespace-nowrap',
                    'bg-transparent shadow-none',
                    'data-[state=active]:text-primary data-[state=active]:border-primary',
                    'data-[state=active]:bg-transparent data-[state=active]:shadow-none',
                    'hover:text-foreground transition-colors',
                  ].join(' ')}
                >
                  {s.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
      </div>

      <div className="px-3 py-4 sm:px-4 lg:px-6 lg:py-6 max-w-4xl mx-auto">
        {projectQ.isError && (
          <ErrorBanner
            className="mb-4"
            message={projectQ.error instanceof ApiError ? projectQ.error.message : 'Error al cargar el proyecto'}
          />
        )}
        <Outlet />
      </div>
    </div>
  )
}
