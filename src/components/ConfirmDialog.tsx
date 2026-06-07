import type { ReactNode } from 'react'
import { Loader2 } from 'lucide-react'

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
import { cn } from '@/lib/utils'

type ConfirmDialogProps = {
  /** Estado controlado de apertura. */
  open?: boolean
  onOpenChange?: (open: boolean) => void
  /** Disparador opcional (botón). Si se omite, el diálogo se controla solo por `open`. */
  trigger?: ReactNode
  title: ReactNode
  description?: ReactNode
  confirmLabel?: string
  /** Texto a mostrar junto al spinner mientras `loading`. Si se omite, se muestra solo el spinner. */
  loadingLabel?: string
  cancelLabel?: string
  destructive?: boolean
  loading?: boolean
  /**
   * Acción al confirmar. El cierre del diálogo queda a cargo del caller
   * (vía su estado controlado o la mutación), igual que en los diálogos originales.
   */
  onConfirm: () => void
}

/**
 * Diálogo de confirmación reutilizable sobre AlertDialog.
 * Centraliza el patrón "header + footer (Cancelar / Acción destructiva con loading)".
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  trigger,
  title,
  description,
  confirmLabel = 'Confirmar',
  loadingLabel,
  cancelLabel = 'Cancelar',
  destructive = false,
  loading = false,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      {trigger ? <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger> : null}
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description ? <AlertDialogDescription>{description}</AlertDialogDescription> : null}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction
            disabled={loading}
            className={cn(
              destructive && 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
            )}
            onClick={(e) => {
              e.preventDefault()
              onConfirm()
            }}
          >
            {loading && <Loader2 className={cn('h-4 w-4 animate-spin', loadingLabel && 'mr-2')} />}
            {loading ? loadingLabel : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
