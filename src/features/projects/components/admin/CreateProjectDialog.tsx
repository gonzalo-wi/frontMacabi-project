import { FolderKanban, Loader2, Plus } from 'lucide-react'
import type { UseMutationResult } from '@tanstack/react-query'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import type { UserDTO } from '@/lib/api/types'

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  name: string
  onNameChange: (value: string) => void
  description: string
  onDescriptionChange: (value: string) => void
  coordinatorId: string
  onCoordinatorIdChange: (value: string) => void
  users: UserDTO[]
  usersLoading: boolean
  createM: UseMutationResult<void, Error, void, unknown>
}

export function CreateProjectDialog({
  open,
  onOpenChange,
  name,
  onNameChange,
  description,
  onDescriptionChange,
  coordinatorId,
  onCoordinatorIdChange,
  users,
  usersLoading,
  createM,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderKanban className="w-4 h-4 text-primary" />
            Nuevo proyecto
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          <div className="space-y-1.5">
            <Label htmlFor="proj-name" className="text-xs font-semibold">
              Nombre del proyecto
            </Label>
            <Input
              id="proj-name"
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              placeholder="Ej: Kiná 2025"
              className="h-10"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="proj-coord" className="text-xs font-semibold">
              Coordinador
            </Label>
            <Select value={coordinatorId} onValueChange={onCoordinatorIdChange}>
              <SelectTrigger id="proj-coord" className="h-10">
                <SelectValue placeholder="Seleccioná un coordinador…" />
              </SelectTrigger>
              <SelectContent>
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    <span className="font-medium">{u.name}</span>
                    <span className="text-muted-foreground text-xs ml-1.5">{u.email}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {usersLoading && (
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Loader2 className="w-3 h-3 animate-spin" /> Cargando usuarios…
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="proj-desc" className="text-xs font-semibold">
              Descripción{' '}
              <span className="font-normal text-muted-foreground">(opcional)</span>
            </Label>
            <Textarea
              id="proj-desc"
              value={description}
              onChange={(e) => onDescriptionChange(e.target.value)}
              rows={2}
              placeholder="Breve descripción del proyecto…"
              className="resize-none"
            />
          </div>

          <Button
            disabled={createM.isPending}
            onClick={() => createM.mutate()}
            className="w-full"
          >
            {createM.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creando…
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 mr-1.5" />
                Crear proyecto
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
