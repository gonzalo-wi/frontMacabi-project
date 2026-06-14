import { useState } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import {
  ArrowLeft,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  CreditCard,
  FileText,
  Loader2,
  Paperclip,
  User,
  X,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { toast } from 'sonner'
import { PageHeader } from '@/components/PageHeader'
import { ErrorBanner } from '@/components/data/ErrorBanner'
import { ExpenseStatusBadge } from '@/features/expenses/components/ExpenseStatusBadge'
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
import { Textarea } from '@/components/ui/textarea'
import {
  approveExpense,
  getExpense,
  getProjectBudget,
  rejectExpense,
} from '@/features/expenses/api/expensesApi'
import { canEditExpense, EditExpenseDialog } from '@/features/expenses/components/EditExpenseDialog'
import { canDeleteExpense, DeleteExpenseButton } from '@/features/expenses/components/DeleteExpenseButton'
import { ReceiptLink } from '@/features/expenses/components/ReceiptLink'
import { wouldExceedBudget } from '@/features/expenses/lib/budget'
import type { ExpenseStatus } from '@/features/expenses/model/types'
import { useProjectRole } from '@/hooks/useProjectRole'
import { ApiError } from '@/lib/api/apiClient'
import { formatARS } from '@/lib/currency'
import { cn } from '@/lib/utils'
import { formatExpenseDate, formatDateTime } from '@/lib/date'
import { useAuth } from '@/hooks/useAuth'

// ── Helpers ────────────────────────────────────────────────────

function statusBannerClass(status: ExpenseStatus): string {
  switch (status) {
    case 'PENDIENTE':
      return 'border-amber-200 bg-amber-50/50 dark:border-amber-800/60 dark:bg-amber-950/20'
    case 'APROBADO':
      return 'border-emerald-200 bg-emerald-50/50 dark:border-emerald-800/60 dark:bg-emerald-950/20'
    case 'RECHAZADO':
      return 'border-destructive/20 bg-destructive/5'
    default:
      return 'border-border bg-muted/5'
  }
}

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

function DetailSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-32 rounded-2xl bg-muted/40 animate-pulse" />
      <div className="h-52 rounded-2xl bg-muted/40 animate-pulse opacity-70" />
      <div className="h-24 rounded-2xl bg-muted/40 animate-pulse opacity-50" />
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────

export default function ExpenseDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { token, user, isRestoring } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const qc = useQueryClient()
  const [rejectReason, setRejectReason] = useState('')
  const [budgetConfirmOpen, setBudgetConfirmOpen] = useState(false)

  const expenseQ = useQuery({
    queryKey: ['expense-detail', id, token],
    enabled: Boolean(token && id) && !isRestoring,
    queryFn: () => getExpense(token!, id!),
  })

  const exp = expenseQ.data
  const participantView = !pathname.startsWith('/app/admin/')
  const { canManage } = useProjectRole(exp?.project_id)

  function goBack() {
    // Volver a la pantalla anterior conserva sus filtros (viven en la URL).
    // Fallback al listado si se entró por deep-link (sin historial).
    if (window.history.length > 1) {
      navigate(-1)
    } else {
      navigate(participantView ? '/app/gastos' : '/app/admin/gastos')
    }
  }

  async function invalidate() {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ['expense-detail', id] }),
      qc.invalidateQueries({ queryKey: ['project-expenses', exp?.project_id] }),
      qc.invalidateQueries({ queryKey: ['project-expense-summary', exp?.project_id] }),
      qc.invalidateQueries({ queryKey: ['my-expenses-global'] }),
      qc.invalidateQueries({ queryKey: ['admin-expenses-dashboard'] }),
    ])
  }

  const approveM = useMutation({
    mutationFn: () => approveExpense(token!, id!),
    onSuccess: async () => {
      toast.success('Gasto aprobado.')
      await invalidate()
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : 'Error'),
  })

  const rejectM = useMutation({
    mutationFn: (reason: string) => rejectExpense(token!, id!, reason),
    onSuccess: async () => {
      setRejectReason('')
      toast.success('Gasto rechazado.')
      await invalidate()
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : 'Error'),
  })

  const anyPending = approveM.isPending || rejectM.isPending

  const showActions = canManage && exp?.status === 'PENDIENTE'

  // Presupuesto: para avisar si aprobar haría superar el límite del mes.
  const budgetQ = useQuery({
    queryKey: ['project-budget', exp?.project_id, token],
    enabled: Boolean(token && exp?.project_id && showActions),
    queryFn: () => getProjectBudget(token!, exp!.project_id),
  })
  const overBudget =
    exp && budgetQ.data
      ? wouldExceedBudget(
          budgetQ.data.current_month_approved,
          budgetQ.data.monthly_budget,
          exp.amount,
          exp.expense_date,
          budgetQ.data.month,
        )
      : null

  function doApprove() {
    setBudgetConfirmOpen(false)
    approveM.mutate()
  }

  if (!id) return null

  const showManageRow =
    exp && user
      ? canEditExpense(exp, user.id, canManage) || canDeleteExpense(exp, user.id, canManage)
      : false

  return (
    <div className="min-h-screen pb-24">
      <PageHeader
        icon={CreditCard}
        title="Gasto"
        subtitle="Detalle del gasto, proyecto asociado y acciones disponibles."
        action={
          <ActionButton intent="back" onClick={goBack}>
            <ArrowLeft className="w-4 h-4" />
            Volver
          </ActionButton>
        }
      />

      <div className="p-4 lg:p-6 max-w-2xl mx-auto space-y-4">

        {expenseQ.isLoading && <DetailSkeleton />}

        {expenseQ.isError && (
          <ErrorBanner
            message={expenseQ.error instanceof ApiError ? expenseQ.error.message : 'No se pudo cargar el gasto.'}
          />
        )}

        {exp && (
          <>
            {/* ── Status banner ── */}
            <div className={cn('rounded-2xl border p-4 sm:p-5 space-y-3', statusBannerClass(exp.status))}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-0.5 min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Monto del gasto
                  </p>
                  <p className="font-bold text-2xl text-foreground tabular-nums leading-tight">
                    {formatARS(exp.amount)}
                  </p>
                  <p className="text-sm text-muted-foreground break-words">{exp.description}</p>
                </div>
                <ExpenseStatusBadge status={exp.status} />
              </div>

              {exp.status === 'RECHAZADO' && (
                <p className="text-sm text-destructive/80 font-medium">Este gasto fue rechazado.</p>
              )}
            </div>

            {/* ── Info card ── */}
            <Card className="rounded-2xl shadow-sm overflow-hidden">
              <CardHeader className="px-4 sm:px-6 pt-4 sm:pt-5 pb-2">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary shrink-0" />
                  Información del gasto
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 sm:px-6 pb-4 divide-y divide-border/60">
                <InfoRow icon={Building2} label="Proyecto" value={exp.project_name?.trim() || 'Proyecto'} />
                <InfoRow icon={User} label="Cargado por" value={exp.submitter_name?.trim() || '—'} />
                <InfoRow icon={Calendar} label="Fecha del gasto" value={formatExpenseDate(exp.expense_date)} />
                {exp.status === 'APROBADO' && (
                  <InfoRow
                    icon={CheckCircle2}
                    label="Aprobado por"
                    value={exp.approved_by_name?.trim() || '—'}
                  />
                )}
                {exp.status === 'APROBADO' && exp.approved_at && (
                  <InfoRow icon={Clock} label="Aprobado el" value={formatDateTime(exp.approved_at)} />
                )}
                {exp.status === 'RECHAZADO' && exp.rejection_reason?.trim() && (
                  <InfoRow icon={X} label="Motivo del rechazo" value={exp.rejection_reason} />
                )}
                <InfoRow icon={Clock} label="Creado el" value={formatDateTime(exp.created_at)} />
                {exp.receipt_storage_path && token && (
                  <div className="flex items-center gap-3 py-3">
                    <div className="h-7 w-7 shrink-0 rounded-lg bg-muted/50 flex items-center justify-center">
                      <Paperclip className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                    <ReceiptLink
                      token={token}
                      expenseId={exp.id}
                      storagePath={exp.receipt_storage_path}
                      onError={(msg) => toast.error(msg)}
                      className="text-sm font-medium text-primary"
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* ── Approve / Reject actions ── */}
            {showActions && (
              <Card className="rounded-2xl shadow-sm overflow-hidden">
                <CardHeader className="px-4 sm:px-6 pt-4 sm:pt-5 pb-3">
                  <CardTitle className="text-sm font-semibold text-muted-foreground">
                    Acciones disponibles
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 sm:px-6 pb-5 flex flex-wrap gap-2">
                  <ActionButton
                    intent="approve"
                    disabled={anyPending}
                    onClick={() => {
                      if (overBudget?.exceeds) {
                        setBudgetConfirmOpen(true)
                        return
                      }
                      doApprove()
                    }}
                  >
                    {approveM.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4" />
                    )}
                    Aprobar
                  </ActionButton>

                  {/* Aviso: aprobar supera el presupuesto del mes */}
                  <AlertDialog open={budgetConfirmOpen} onOpenChange={setBudgetConfirmOpen}>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Supera el presupuesto del mes</AlertDialogTitle>
                        <AlertDialogDescription>
                          {overBudget
                            ? `Aprobar este gasto deja el mes en ${formatARS(overBudget.projected)} de ${formatARS(overBudget.budget)} de presupuesto. ¿Aprobar igual?`
                            : '¿Aprobar igual?'}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-green-600 text-white hover:bg-green-700"
                          onClick={doApprove}
                        >
                          Aprobar igual
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>

                  <AlertDialog onOpenChange={(o) => !o && setRejectReason('')}>
                    <AlertDialogTrigger asChild>
                      <ActionButton intent="reject" disabled={anyPending}>
                        {rejectM.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <X className="w-4 h-4" />
                        )}
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
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        placeholder="Motivo del rechazo (opcional)"
                        className="resize-none"
                      />
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          onClick={() => {
                            rejectM.mutate(rejectReason.trim())
                          }}
                        >
                          Rechazar
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </CardContent>
              </Card>
            )}

            {/* ── Manage row (edit / delete) ── */}
            {showManageRow && user && (
              <Card className="rounded-2xl shadow-sm overflow-hidden">
                <CardContent className="px-4 sm:px-6 py-4 flex items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground">
                    Editá el gasto o su comprobante.
                  </span>
                  <div className="flex items-center gap-2">
                    <EditExpenseDialog
                      token={token!}
                      exp={exp}
                      viewerUserId={user.id}
                      coordinatorMode={canManage}
                      onEdited={async () => {
                        toast.success('Gasto actualizado.')
                        await invalidate()
                      }}
                      onError={(msg) => toast.error(msg)}
                    />
                    <DeleteExpenseButton
                      token={token!}
                      exp={exp}
                      viewerUserId={user.id}
                      coordinatorMode={canManage}
                      onDeleted={async () => {
                        await invalidate()
                        goBack()
                      }}
                      onError={(msg) => toast.error(msg)}
                    />
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  )
}
