import { Link } from 'react-router-dom'
import { Eye, MoreVertical, Trash2 } from 'lucide-react'

import { ActionIconButton } from '@/components/ActionButton'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { ProjectDTO } from '@/features/projects/model/types'

type Props = {
  project: ProjectDTO
  onRequestDelete: (project: ProjectDTO) => void
}

export function ProjectActionsMenu({ project, onRequestDelete }: Props) {
  return (
    <div className="flex items-center gap-1 shrink-0">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <ActionIconButton intent="secondary" label={`Acciones: ${project.name}`}>
            <MoreVertical className="w-4 h-4" />
          </ActionIconButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[11rem]">
          <DropdownMenuItem asChild>
            <Link to={`/app/admin/proyectos/${project.id}/resumen`} className="gap-2">
              <Eye className="w-4 h-4" />
              Ver proyecto
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem
            className="text-destructive focus:text-destructive gap-2"
            onSelect={() => onRequestDelete(project)}
          >
            <Trash2 className="w-4 h-4" />
            Eliminar
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
