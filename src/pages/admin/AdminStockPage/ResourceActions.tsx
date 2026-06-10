import { MoreVertical, Pencil, Trash2 } from 'lucide-react'

import { ActionIconButton } from '@/components/ActionButton'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { ResourceDTO } from '@/features/stock/model/types'

export function ResourceActions({
  resource,
  onEdit,
  onDelete,
}: {
  resource: ResourceDTO
  onEdit: (resource: ResourceDTO) => void
  onDelete: (id: string) => void
}) {
  return (
    <AlertDialog>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <ActionIconButton intent="secondary" label={`Acciones: ${resource.name}`}>
            <MoreVertical className="w-4 h-4" />
          </ActionIconButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[11rem]">
          <DropdownMenuItem onClick={() => onEdit(resource)}>
            <Pencil className="w-4 h-4" />
            Editar
          </DropdownMenuItem>
          <AlertDialogTrigger asChild>
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onSelect={(event) => event.preventDefault()}
            >
              <Trash2 className="w-4 h-4" />
              Eliminar
            </DropdownMenuItem>
          </AlertDialogTrigger>
        </DropdownMenuContent>
      </DropdownMenu>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Eliminar "{resource.name}"?</AlertDialogTitle>
          <AlertDialogDescription>
            No se puede deshacer. Si el ítem tiene pedidos activos, el servidor puede rechazar la
            operación.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground"
            onClick={() => onDelete(resource.id)}
          >
            Eliminar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
