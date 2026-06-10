import { Loader2, UserPlus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
  onSubmit,
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
  onSubmit: (e: React.FormEvent) => void
  onCancel: () => void
  isPending: boolean
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 shrink-0">
              <UserPlus className="w-4 h-4 text-primary" />
            </div>
            Agregar usuario
          </DialogTitle>
          <p className="text-sm text-muted-foreground pt-1">
            Se envía una invitación por correo. La persona definirá su contraseña al aceptar.
          </p>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="invite-name" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Nombre</Label>
            <Input id="invite-name" value={name} onChange={(e) => onName(e.target.value)} placeholder="Nombre completo" className="h-11" autoComplete="name" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="invite-email" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Correo</Label>
            <Input id="invite-email" type="email" value={email} onChange={(e) => onEmail(e.target.value)} placeholder="correo@ejemplo.org" className="h-11" autoComplete="email" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Rol inicial</Label>
            <Select value={role} onValueChange={(v) => onRole(v as 'user' | 'admin')}>
              <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="user">Usuario</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending
                ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Enviando…</>
                : <><UserPlus className="mr-2 h-4 w-4" />Enviar invitación</>}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
