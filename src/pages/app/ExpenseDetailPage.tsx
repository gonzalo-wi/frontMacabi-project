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

import { toast } from 'sonner'
import { PageHeader } from '@/components/PageHeader'
import { ErrorBanner } from '@/components/data/ErrorBanner'
import { InfoRow } from '@/components/data/InfoRow'
import { DetailSkeleton } from '@/components/data/DetailSkeleton'
import { ExpenseStatusBadge } from '@/features/expenses/components/ExpenseStatusBadge'
import { ActionButton } from '@/components/ActionButton'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { canEditExpense, EditExpenseDialog } from '@/features/expenses/components/EditExpenseDialog'
import { canDeleteExpense, DeleteExpenseButton } from '@/features/expenses/components/DeleteExpenseButton'
import { ReceiptLink } from '@/features/expenses/components/ReceiptLink'
import { RejectExpenseDialog } from '@/features/expenses/components/RejectExpenseDialog'
import { useExpenseDetailPage } from '@/features/expenses/hooks/useExpenseDetailPage'
import { ApiError } from '@/lib/api/apiClient'
import { expenseStatusBannerClass } from '@/features/expenses/lib/status'
import { formatARS } from '@/lib/currency'
import { cn } from '@/lib/utils'
import { formatExpenseDate, formatDateTime } from '@/lib/date'
import { useAuth } from '@/hooks/useAuth'

export default function ExpenseDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { token, user, isRestoring } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [budgetConfirmOpen, setBudgetConfirmOpen] = useState(false)

  const participantView = !pathname.startsWith('/app/admin/')

  const {
    expenseQ,
    exp,
    canManage,
    showActions,
    overBudget,
    approveM,
    rejectM,
    anyPending,
    invalidate,
  } = useExpenseDetailPage({ id, token, isRestoring })

  function goBack() {
    if (window.history.length > 1) {
      navigate(-1)
    } else {
      navigate(participantView ? '/app/gastos' : '/app/admin/gastos')
    }
  }

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
            <div className={cn('rounded-2xl border p-4 sm:p-5 space-y-3', expenseStatusBannerClass(exp.status))}>
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

                  <ConfirmDialog
                    open={budgetConfirmOpen}
                    onOpenChange={setBudgetConfirmOpen}
                    title="Supera el presupuesto del mes"
                    description={
                      overBudget
                        ? `Aprobar este gasto deja el mes en ${formatARS(overBudget.projected)} de ${formatARS(overBudget.budget)} de presupuesto. ¿Aprobar igual?`
                        : '¿Aprobar igual?'
                    }
                    confirmLabel="Aprobar igual"
                    loading={approveM.isPending}
                    onConfirm={doApprove}
                  />

                  <RejectExpenseDialog
                    disabled={anyPending}
                    loading={rejectM.isPending}
                    onReject={(reason) => rejectM.mutate(reason)}
                  />
                </CardContent>
              </Card>
            )}

            {showManageRow && user && (
              <Card className="rounded-2xl shadow-sm overflow-hidden">
                <CardContent className="px-4 sm:px-6 py-4 flex items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground">Editá el gasto o su comprobante.</span>
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
