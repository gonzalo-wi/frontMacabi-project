import { CalendarDays, RotateCcw, User } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { StockRequestStatusBadge } from '@/features/stock/components/StockRequestStatusBadge'
import { RESOURCE_TYPE_LABELS } from '@/features/stock/lib/stockLabels'
import type { ResourceRequestDTO } from '@/features/stock/model/types'
import { formatShort } from '@/lib/date'
import { requestStatusBorderClass } from '@/lib/status'
import { cn } from '@/lib/utils'
import { RequestActions } from './RequestActions'

/** ¿El pedido tiene alguna acción disponible para el coordinador/admin? */
function hasActionable(req: ResourceRequestDTO): boolean {
  if (req.status === 'PENDIENTE') return true
  if (req.status === 'RESERVADO') return true
  if (req.status === 'ENTREGADO' && req.resource_type === 'returnable') return true
  return false
}

export function RequestRow({
  req,
  canManage,
  isPending,
  onApprove,
  onReject,
  onDeliver,
  onReturn,
}: {
  req: ResourceRequestDTO
  canManage: boolean
  isPending: boolean
  onApprove: () => void
  onReject: () => void
  onDeliver: () => void
  onReturn: () => void
}) {
  return (
    <div
      className={cn(
        'rounded-xl border border-border/70 bg-card border-l-[3px] overflow-hidden',
        requestStatusBorderClass(req.status),
      )}
    >
      {/* Main info */}
      <div className="flex flex-wrap items-start gap-x-4 gap-y-2 pl-3.5 pr-3 pt-3 pb-2.5">
        <div className="flex-1 min-w-0 space-y-1">
          <p className="font-semibold text-sm text-foreground leading-tight">{req.resource_name}</p>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
            <Badge variant="outline" className="text-[10px] font-medium px-1.5 py-0">
              {RESOURCE_TYPE_LABELS[req.resource_type]}
            </Badge>
            <span className="flex items-center gap-1">
              <User className="w-3 h-3 shrink-0 opacity-60" />
              {req.requester_name}
            </span>
          </div>
        </div>

        <span className="shrink-0 mt-0.5 inline-flex items-center justify-center h-6 min-w-[2.25rem] rounded-full bg-muted text-xs font-bold tabular-nums px-2 text-muted-foreground">
          {req.quantity} u.
        </span>

        <div className="shrink-0 mt-0.5">
          <StockRequestStatusBadge status={req.status} />
        </div>
      </div>

      {/* Dates */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-0.5 pl-3.5 pb-2.5 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <CalendarDays className="w-3 h-3 shrink-0 opacity-60" />
          Retiro:{' '}
          <span className="font-medium text-foreground/80">{formatShort(req.withdrawal_date)}</span>
        </span>
        {req.return_date && (
          <span className="flex items-center gap-1.5">
            <RotateCcw className="w-3 h-3 shrink-0 opacity-60" />
            Dev.:{' '}
            <span className="font-medium text-foreground/80">{formatShort(req.return_date)}</span>
          </span>
        )}
      </div>

      {/* Actions — only when there's something to do */}
      {canManage && hasActionable(req) && (
        <div className="border-t border-border/60 bg-muted/20 px-3 py-2 flex justify-end gap-2">
          <RequestActions
            req={req}
            onApprove={onApprove}
            onReject={onReject}
            onDeliver={onDeliver}
            onReturn={onReturn}
            isPending={isPending}
          />
        </div>
      )}
    </div>
  )
}
