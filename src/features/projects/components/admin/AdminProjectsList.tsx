import { Link } from 'react-router-dom'

import { MobileList } from '@/components/data/MobileList'
import { SortableTable } from '@/components/data/SortableTable'
import { ProjectActionsMenu } from '@/features/projects/components/admin/ProjectActionsMenu'
import { projectAvatarColor, projectInitial } from '@/features/projects/lib/projectHelpers'
import type { ProjectDTO } from '@/features/projects/model/types'
import { cn } from '@/lib/utils'

type ProjectSortKey = 'name' | 'description'

type Props = {
  rows: ProjectDTO[]
  sortKey: ProjectSortKey
  sortDir: 'asc' | 'desc'
  onSort: (key: ProjectSortKey) => void
  isLoading: boolean
  emptyMessage: string
  onRequestDelete: (project: ProjectDTO) => void
}

export function AdminProjectsList({
  rows,
  sortKey,
  sortDir,
  onSort,
  isLoading,
  emptyMessage,
  onRequestDelete,
}: Props) {
  return (
    <>
      <SortableTable
        rows={rows}
        columns={[
          {
            id: 'name',
            header: 'Proyecto',
            sortKey: 'name',
            render: (project) => (
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    'h-8 w-8 shrink-0 rounded-lg flex items-center justify-center text-sm font-bold select-none',
                    projectAvatarColor(project.name),
                  )}
                >
                  {projectInitial(project.name)}
                </div>
                <Link
                  className="font-semibold text-primary hover:underline"
                  to={`/app/admin/proyectos/${project.id}/resumen`}
                >
                  {project.name}
                </Link>
              </div>
            ),
          },
          {
            id: 'description',
            header: 'Descripción',
            sortKey: 'description',
            render: (project) => (
              <span className="line-clamp-2 text-muted-foreground text-sm">
                {project.description ?? '—'}
              </span>
            ),
          },
          {
            id: 'actions',
            header: 'Acciones',
            headerClassName: 'text-right w-[1%] whitespace-nowrap',
            className: 'text-right',
            render: (project) => (
              <ProjectActionsMenu project={project} onRequestDelete={onRequestDelete} />
            ),
          },
        ]}
        getRowKey={(project) => project.id}
        sortKey={sortKey}
        sortDir={sortDir}
        onSort={onSort}
        isLoading={isLoading}
        emptyMessage={emptyMessage}
      />

      <MobileList
        rows={rows}
        getRowKey={(project) => project.id}
        isLoading={isLoading}
        emptyMessage={emptyMessage}
        renderRow={(project) => (
          <div className="flex items-start gap-3">
            <div
              className={cn(
                'h-9 w-9 shrink-0 rounded-xl flex items-center justify-center text-sm font-bold select-none mt-0.5',
                projectAvatarColor(project.name),
              )}
            >
              {projectInitial(project.name)}
            </div>

            <div className="min-w-0 flex-1 space-y-0.5">
              <Link
                className="font-semibold text-primary hover:underline leading-tight block"
                to={`/app/admin/proyectos/${project.id}/resumen`}
              >
                {project.name}
              </Link>
              {project.description && (
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {project.description}
                </p>
              )}
            </div>

            <ProjectActionsMenu project={project} onRequestDelete={onRequestDelete} />
          </div>
        )}
      />
    </>
  )
}
