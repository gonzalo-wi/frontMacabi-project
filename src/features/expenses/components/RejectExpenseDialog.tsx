import { useState } from 'react'
import { Loader2, X } from 'lucide-react'

import { ActionButton } from '@/components/ActionButton'
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
import { Textarea } from '@/components/ui/textarea'

type RejectExpenseDialogProps = {
  disabled?: boolean
  loading?: boolean
  onReject: (reason: string) => void
}

export function RejectExpenseDialog({ disabled, loading, onReject }: RejectExpenseDialogProps) {
  const [reason, setReason] = useState('')

  return (
    <AlertDialog
      onOpenChange={(open) => {
        if (!open) setReason('')
      }}
    >
      <AlertDialogTrigger asChild>
        <ActionButton intent="reject" disabled={disabled}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
          Rechazar
        </ActionButton>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Rechazar gasto?</AlertDialogTitle>
          <AlertDialogDescription>
            Podés indicar un motivo (opcional) que verá quien cargó el gasto.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <Textarea
          rows={3}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Motivo del rechazo (opcional)"
          className="resize-none"
        />
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={() => onReject(reason.trim())}
          >
            Rechazar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
