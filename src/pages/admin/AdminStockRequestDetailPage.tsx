import { useNavigate, useParams, useLocation } from 'react-router-dom'
import {
  ArrowLeft,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  FileText,
  Loader2,
  Package,
  RotateCcw,
  Truck,
  User,
  X,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { FeedbackBanner } from '@/components/FeedbackBanner'
import { useFeedback } from '@/hooks/useFeedback'
import { PageHeader } from '@/components/PageHeader'
import { StockRequestStatusBadge } from '@/features/stock/components/StockRequestStatusBadge'
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  approveRequest,
  deliverRequest,
  getRequest,
  rejectRequest,
  returnRequest,
} from '@/features/stock/api/requestsApi'
import type { RequestStatus, ResourceType } from '@/features/stock/model/types'
import { useProjectRole } from '@/hooks/useProjectRole'
import { ApiError } from '@/lib/api/apiClient'
import { cn } from '@/lib/utils'
import { formatDateShort, formatDateTime } from '@/lib/date'
import { useAuth } from '@/hooks/useAuth'

// ── Constants ─────────────────────────────────────────────────

const RESOURCE_TYPE_LABELS: Record<ResourceType, string> = {
  returnable: 'Retornable',
  consumable: 'Consumible',
}

type WorkflowStep = { key: RequestStatus; label: string }

const RETURNABLE_STEPS: WorkflowStep[] = [
  { key: 'PENDIENTE', label: 'Pendiente' },
  { key: 'RESERVADO', label: 'Reservado' },
  { key: 'ENTREGADO', label: 'Entregado' },
  { key: 'DEVUELTO',  label: 'Devuelto'  },
]

const CONSUMABLE_STEPS: WorkflowStep[] = [
  { key: 'PENDIENTE', label: 'Pendiente' },
  { key: 'RESERVADO', label: 'Reservado' },
  { key: 'ENTREGADO', label: 'Entregado' },
]

// ── Helpers ────────────────────────────────────────────────────

function statusBannerClass(status: RequestStatus): string {
  switch (status) {
    case 'PENDIENTE':  return 'border-amber-200   bg-amber-50/50'
    case 'RESERVADO':  return 'border-primary/20   bg-primary/5'
    case 'ENTREGADO':  return 'border-emerald-200  bg-emerald-50/50'
    case 'DEVUELTO':   return 'border-slate-200    bg-slate-50/30'
    case 'RECHAZADO':  return 'border-destructive/20 bg-destructive/5'
    default:           return 'border-border bg-muted/5'
  }
}

// ── Skeleton ───────────────────────────────────────────────────

function DetailSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-36 rounded-2xl bg-muted/40 animate-pulse" />
      <div className="h-52 rounded-2xl bg-muted/40 animate-pulse opacity-70" />
      <div className="h-24 rounded-2xl bg-muted/40 animate-pulse opacity-50" />
    </div>
  )
}

// ── InfoRow ────────────────────────────────────────────────────

function InfoRow({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 py-3">
      <div className="h-7 w-7 shrink-0 rounded-lg bg-muted/50 flex items-center justify-center mt-0.5">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      </div>
      <div className="flex-1 flex items-start justify-between gap-4 min-w-0">
        <span className="text-sm text-muted-foreground shrink-0">{label}</span>
        <span className="text-sm font-medium text-right break-words max-w-[55%]">{value}</span>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────

export default function AdminStockRequestDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { token, isRestoring } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const qc = useQueryClient()
  const { feedback, setFeedback } = useFeedback()

  const requestQ = useQuery({
    queryKey: ['stock-request-detail', id, token],
    enabled: Boolean(token && id) && !isRestoring,
    queryFn: () => getRequest(token!, id!),
  })

  const req = requestQ.data

  // ── Transition mutations ──────────────────────────────────────

  function makeTransition(
    fn: (token: string, rid: string) => Promise<void>,
    successText: string,
  ) {
    return useMutation({
      mutationFn: () => fn(token!, id!),
      onSuccess: async () => {
        setFeedback({ text: successText, variant: 'success' })
        await qc.invalidateQueries({ queryKey: ['stock-request-detail', id] })
        await qc.invalidateQueries({ queryKey: ['project-stock-requests', req?.project_id] })
        await qc.invalidateQueries({ queryKey: ['admin-stock-resources'] })
      },
      onError: (e) =>
        setFeedback({ text: e instanceof Error ? e.message : 'Error', variant: 'error' }),
    })
  }

  // eslint-disable-next-line react-hooks/rules-of-hooks
  const approveM = makeTransition(approveRequest, 'Pedido aprobado y material reservado.')
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const rejectM = makeTransition(rejectRequest, 'Pedido rechazado.')
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const deliverM = makeTransition(deliverRequest, 'Pedido marcado como entregado.')
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const returnM = makeTransition(returnRequest, 'Ítem marcado como devuelto.')

  const participantView = !pathname.startsWith('/app/admin/')
  const { canManage: canManageRequest } = useProjectRole(req?.project_id)
  const anyPending = approveM.isPending || rejectM.isPending || deliverM.isPending || returnM.isPending

  if (!id) return null

  // Workflow
  const steps = req?.resource_type === 'returnable' ? RETURNABLE_STEPS : CONSUMABLE_STEPS
  const currentStepIdx = req ? steps.findIndex((s) => s.key === req.status) : -1
  const isTerminal =
    req?.status === 'RECHAZADO' ||
    req?.status === 'DEVUELTO' ||
    (req?.status === 'ENTREGADO' && req?.resource_type === 'consumable')

  return (
    <div className="min-h-screen pb-24">
      <PageHeader
        icon={Package}
        title="Pedido de material"
        subtitle="Detalle del pedido, proyecto asociado y acciones disponibles."
        action={
          <ActionButton
            intent="back"
            onClick={() => {
              if (participantView) {
                navigate('/app/stock')
                return
              }
              navigate(-1)
            }}
          >
            <ArrowLeft className="w-4 h-4" />
            Volver
          </ActionButton>
        }
      />

      <div className="p-4 lg:p-6 max-w-2xl mx-auto space-y-4">
        {feedback && <FeedbackBanner message={feedback.text} variant={feedback.variant} />}

        {requestQ.isLoading && <DetailSkeleton />}

        {requestQ.isError && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {requestQ.error instanceof ApiError
              ? requestQ.error.message
              : 'No se pudo cargar el pedido.'}
          </div>
        )}

        {req && (
          <>
            {/* ── Status banner ── */}
            <div
              className={cn(
                'rounded-2xl border p-4 sm:p-5 space-y-4',
                statusBannerClass(req.status),
              )}
            >
              {/* Header */}
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-0.5 min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Recurso solicitado
                  </p>
                  <p className="font-bold text-base text-foreground leading-tight">
                    {req.resource_name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {req.quantity} u. · {RESOURCE_TYPE_LABELS[req.resource_type]}
                  </p>
                </div>
                <StockRequestStatusBadge status={req.status} />
              </div>

              {/* Workflow stepper (not shown for rejected) */}
              {req.status !== 'RECHAZADO' && (
                <div className="flex items-start">
                  {steps.map((step, i) => {
                    const isDone = i <= currentStepIdx
                    const isCurrent = i === currentStepIdx
                    return (
                      <div key={step.key} className="flex items-center flex-1 last:flex-none">
                        <div className="flex flex-col items-center gap-1 shrink-0">
                          <div
                            className={cn(
                              'h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold border-2 transition-colors',
                              isDone && isCurrent
                                ? 'border-primary bg-primary text-primary-foreground'
                                : isDone
                                ? 'border-emerald-500 bg-emerald-500 text-white'
                                : 'border-border bg-background text-muted-foreground',
                            )}
                          >
                            {isDone && !isCurrent ? '✓' : i + 1}
                          </div>
                          <span
                            className={cn(
                              'text-[9px] font-semibold whitespace-nowrap',
                              isCurrent
                                ? 'text-primary'
                                : isDone
                                ? 'text-emerald-600'
                                : 'text-muted-foreground/50',
                            )}
                          >
                            {step.label}
                          </span>
                        </div>
                        {i < steps.length - 1 && (
                          <div
                            className={cn(
                              'h-[2px] flex-1 mx-1.5 rounded-full mb-4',
                              i < currentStepIdx ? 'bg-emerald-400' : 'bg-border',
                            )}
                          />
                        )}
                      </div>
                    )
                  })}
                </div>
              )}

              {req.status === 'RECHAZADO' && (
                <p className="text-sm text-destructive/80 font-medium">
                  Este pedido fue rechazado y no se reservó material.
                </p>
              )}
            </div>

            {/* ── Info card ── */}
            <Card className="rounded-2xl shadow-sm overflow-hidden">
              <CardHeader className="px-4 sm:px-6 pt-4 sm:pt-5 pb-2">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary shrink-0" />
                  Información del pedido
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 sm:px-6 pb-4 divide-y divide-border/60">
                <InfoRow icon={Building2} label="Proyecto"       value={req.project_name} />
                <InfoRow icon={User}      label="Solicitado por" value={req.requester_name} />
                <InfoRow icon={Calendar}  label="Fecha de retiro" value={formatDateShort(req.withdrawal_date)} />
                {req.return_date && (
                  <InfoRow
                    icon={RotateCcw}
                    label="Fecha de devolución"
                    value={formatDateShort(req.return_date)}
                  />
                )}
                {req.notes && (
                  <InfoRow icon={FileText} label="Notas" value={req.notes} />
                )}
                <InfoRow icon={Clock} label="Creado el" value={formatDateTime(req.created_at)} />
              </CardContent>
            </Card>

            {/* ── Actions card ── */}
            {canManageRequest && !isTerminal && (
              <Card className="rounded-2xl shadow-sm overflow-hidden">
                <CardHeader className="px-4 sm:px-6 pt-4 sm:pt-5 pb-3">
                  <CardTitle className="text-sm font-semibold text-muted-foreground">
                    Acciones disponibles
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 sm:px-6 pb-5 flex flex-wrap gap-2">
                  {req.status === 'PENDIENTE' && (
                    <>
                      <ActionButton
                        intent="approve"
                        disabled={anyPending}
                        onClick={() => { setFeedback(null); approveM.mutate() }}
                      >
                        {approveM.isPending
                          ? <Loader2 className="w-4 h-4 animate-spin" />
                          : <CheckCircle2 className="w-4 h-4" />}
                        Aprobar
                      </ActionButton>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <ActionButton intent="reject" disabled={anyPending}>
                            {rejectM.isPending
                              ? <Loader2 className="w-4 h-4 animate-spin" />
                              : <X className="w-4 h-4" />}
                            Rechazar
                          </ActionButton>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>¿Rechazar pedido?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Se marcará como rechazado y el material no será reservado.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-destructive text-destructive-foreground"
                              onClick={() => { setFeedback(null); rejectM.mutate() }}
                            >
                              Rechazar
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </>
                  )}

                  {req.status === 'RESERVADO' && (
                    <ActionButton
                      intent="deliver"
                      disabled={anyPending}
                      onClick={() => { setFeedback(null); deliverM.mutate() }}
                    >
                      {deliverM.isPending
                        ? <Loader2 className="w-4 h-4 animate-spin" />
                        : <Truck className="w-4 h-4" />}
                      Marcar como entregado
                    </ActionButton>
                  )}

                  {req.status === 'ENTREGADO' && req.resource_type === 'returnable' && (
                    <ActionButton
                      intent="return"
                      disabled={anyPending}
                      onClick={() => { setFeedback(null); returnM.mutate() }}
                    >
                      {returnM.isPending
                        ? <Loader2 className="w-4 h-4 animate-spin" />
                        : <RotateCcw className="w-4 h-4" />}
                      Marcar como devuelto
                    </ActionButton>
                  )}
                </CardContent>
              </Card>
            )}

            {/* ── Link to project ── */}
            {!participantView && (
              <div className="flex justify-center">
                <ActionButton
                  intent="secondary"
                  onClick={() => navigate(`/app/admin/proyectos/${req.project_id}/recursos`)}
                >
                  Ver pedidos del proyecto
                </ActionButton>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
