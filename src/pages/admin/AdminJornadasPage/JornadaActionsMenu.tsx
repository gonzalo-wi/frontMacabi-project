import { Link } from 'react-router-dom'
import {
  Copy,
  FileText,
  Loader2,
  Lock,
  LockOpen,
  MoreVertical,
  SquarePen,
  Trash2,
  XOctagon,
} from 'lucide-react'

import { ActionIconButton } from '@/components/ActionButton'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { EventInstanceDTO } from '@/features/events/model/types'

export function JornadaActionsMenu({
  row,
  pendingId,
  onDuplicate,
  onOpen,
  onClose,
  onCancelRequest,
  onDeleteRequest,
}: {
  row: EventInstanceDTO
  pendingId: string | null
  onDuplicate: () => void
  onOpen: () => void
  onClose: () => void
  onCancelRequest: () => void
  onDeleteRequest: () => void
}) {
  const ficha = `/app/admin/jornadas/${row.id}`
  const editar = `/app/admin/jornadas/${row.id}/editar`
  const isThisRowPending = pendingId === row.id
  const canToggleOpen = row.status !== 'open' && row.status !== 'cancelled'
  const showClose = row.status === 'open'
  const canCancel = row.status !== 'cancelled'

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <ActionIconButton
          type="button"
          intent="secondary"
          label={`Acciones: ${row.title}`}
        >
          {isThisRowPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <MoreVertical className="h-4 w-4" />
          )}
        </ActionIconButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[13rem]">
        <DropdownMenuItem asChild>
          <Link to={ficha}>
            <FileText />
            Ver ficha
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to={editar}>
            <SquarePen />
            Editar formulario
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem disabled={isThisRowPending} onClick={onDuplicate}>
          <Copy />
          Duplicar
        </DropdownMenuItem>

        {(canToggleOpen || showClose || canCancel) && <DropdownMenuSeparator />}

        {canToggleOpen && (
          <DropdownMenuItem disabled={isThisRowPending} onClick={onOpen}>
            <LockOpen />
            Abrir respuestas
          </DropdownMenuItem>
        )}
        {showClose && (
          <DropdownMenuItem disabled={isThisRowPending} onClick={onClose}>
            <Lock />
            Cerrar respuestas
          </DropdownMenuItem>
        )}
        {canCancel && (
          <DropdownMenuItem
            variant="destructive"
            disabled={isThisRowPending}
            onClick={onCancelRequest}
          >
            <XOctagon />
            Cancelar jornada
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator />

        <DropdownMenuItem
          variant="destructive"
          disabled={isThisRowPending}
          onClick={onDeleteRequest}
        >
          <Trash2 />
          Eliminar jornada
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
