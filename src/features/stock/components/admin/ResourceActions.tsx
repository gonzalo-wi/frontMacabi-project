import { useState } from 'react'
import { MoreVertical, Pencil, Trash2 } from 'lucide-react'

import { ActionIconButton } from '@/components/ActionButton'
import { ConfirmDialog } from '@/components/ConfirmDialog'
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
  const [deleteOpen, setDeleteOpen] = useState(false)

  return (
    <>
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
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onSelect={() => setDeleteOpen(true)}
          >
            <Trash2 className="w-4 h-4" />
            Eliminar
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={`¿Eliminar "${resource.name}"?`}
        description="No se puede deshacer. Si el ítem tiene pedidos activos, el servidor puede rechazar la operación."
        confirmLabel="Eliminar"
        destructive
        onConfirm={() => {
          onDelete(resource.id)
          setDeleteOpen(false)
        }}
      />
    </>
  )
}
