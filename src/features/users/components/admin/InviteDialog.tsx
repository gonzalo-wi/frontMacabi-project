import { Loader2, UserPlus } from 'lucide-react'

import { FormField } from '@/components/FormField'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export function InviteDialog({
  open,
  onOpenChange,
  name,
  email,
  role,
  onName,
  onEmail,
  onRole,
  onAdd,
  onAddAndInvite,
  onCancel,
  isPending,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  name: string
  email: string
  role: 'user' | 'admin'
  onName: (v: string) => void
  onEmail: (v: string) => void
  onRole: (v: 'user' | 'admin') => void
  onAdd: (e: React.FormEvent) => void
  onAddAndInvite: (e: React.FormEvent) => void
  onCancel: () => void
  isPending: boolean
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-primary" />
            Agregar usuario
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          <p className="text-sm text-muted-foreground leading-relaxed">
            <span className="font-medium text-foreground">Agregar sin invitar</span> lo carga en el sistema
            para asignarlo a proyectos. Después, desde su ficha, usá{' '}
            <span className="font-medium text-foreground">Enviar invitación</span> para mandarle el acceso por correo.
          </p>

          <FormField label="Nombre" htmlFor="invite-name">
            <Input
              id="invite-name"
              value={name}
              onChange={(e) => onName(e.target.value)}
              placeholder="Nombre completo"
              className="h-10"
              autoComplete="name"
            />
          </FormField>

          <FormField label="Correo" htmlFor="invite-email">
            <Input
              id="invite-email"
              type="email"
              value={email}
              onChange={(e) => onEmail(e.target.value)}
              placeholder="correo@ejemplo.org"
              className="h-10"
              autoComplete="email"
            />
          </FormField>

          <FormField label="Rol inicial">
            <Select value={role} onValueChange={(v) => onRole(v as 'user' | 'admin')}>
              <SelectTrigger className="h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">Usuario</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </FormField>

          <div className="space-y-2 pt-1">
            <Button type="button" className="w-full" disabled={isPending} onClick={onAddAndInvite}>
              {isPending
                ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Enviando…</>
                : <><UserPlus className="mr-2 h-4 w-4" />Agregar e invitar</>}
            </Button>
            <Button type="button" variant="secondary" className="w-full" disabled={isPending} onClick={onAdd}>
              {isPending
                ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Agregando…</>
                : 'Agregar sin invitar'}
            </Button>
            <Button type="button" variant="outline" className="w-full" onClick={onCancel} disabled={isPending}>
              Cancelar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
