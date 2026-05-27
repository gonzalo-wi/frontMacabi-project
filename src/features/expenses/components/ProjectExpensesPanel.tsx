import { useEffect, useMemo, useRef, useState } from 'react'
import { CreditCard, Loader2, Paperclip, Plus, TrendingUp } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { FeedbackBanner } from '@/components/FeedbackBanner'
import { ExpenseStatusBadge } from '@/components/StatusBadge'
import { PaginationControls } from '@/components/admin/PaginationControls'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  approveExpense,
  createExpense,
  getProjectExpenseSummary,
  listProjectExpenses,
  uploadReceipt,
  validateReceiptFile,
  RECEIPT_ACCEPT,
  rejectExpense,
} from '@/features/expenses/api/expensesApi'
import { DeleteExpenseButton } from '@/features/expenses/components/DeleteExpenseButton'
import { EditExpenseDialog } from '@/features/expenses/components/EditExpenseDialog'
import { ReceiptLink } from '@/features/expenses/components/ReceiptLink'
import type { ExpenseDTO, ExpenseStatus } from '@/features/expenses/model/types'
import { ApiError } from '@/lib/api/apiClient'
import { cn } from '@/lib/utils'

// ─────────────────────────────────────────────────────────────────────────────
// Formatters
// ─────────────────────────────────────────────────────────────────────────────

function formatARS(amount: string): string {
  const num = parseFloat(amount)
  if (isNaN(num)) return amount
  return num.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatExpenseDate(dateStr: string): string {
  const parts = dateStr.split('-')
  if (parts.length !== 3) return dateStr
  const [y, m, d] = parts
  return `${d}/${m}/${y}`
}

function formatMonth(monthStr: string): string {
  const parts = monthStr.split('-')
  if (parts.length < 2) return monthStr
  const [year, month] = parts
  const labels = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
  const idx = parseInt(month, 10) - 1
  return `${labels[idx] ?? month} ${year.slice(2)}`
}

function statusBorderClass(status: ExpenseStatus): string {
  switch (status) {
    case 'APROBADO':
      return 'border-l-emerald-500 dark:border-l-emerald-600'
    case 'RECHAZADO':
      return 'border-l-red-400 dark:border-l-red-600'
    case 'PENDIENTE':
    default:
      return 'border-l-amber-400 dark:border-l-amber-500'
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Skeleton
// ─────────────────────────────────────────────────────────────────────────────

function ExpenseSkeleton() {
  return (
    <div className="space-y-2.5">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="h-24 rounded-xl bg-muted/50 animate-pulse"
          style={{ opacity: 1 - i * 0.25 }}
        />
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Panel
// ─────────────────────────────────────────────────────────────────────────────

type Props = {
  token: string
  viewerUserId: string
  projectId: string
  /** Coordinador local del proyecto o admin global: puede aprobar/rechazar todos los gastos. */
  coordinatorMode: boolean
}

export function ProjectExpensesPanel({ token, viewerUserId, projectId, coordinatorMode }: Props) {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [page, setPage] = useState(1)
  const [feedback, setFeedback] = useState<{
    text: string
    variant: 'success' | 'error' | 'info'
  } | null>(null)

  useEffect(() => {
    if (!feedback) return
    const timer = setTimeout(() => setFeedback(null), 4000)
    return () => clearTimeout(timer)
  }, [feedback])

  const [amount, setAmount] = useState('')
  const [concept, setConcept] = useState('')
  const [expDate, setExpDate] = useState(() => new Date().toISOString().slice(0, 10))

  const expensesQ = useQuery({
    queryKey: ['project-expenses', projectId, token, page],
    queryFn: () => listProjectExpenses(token, projectId, page, 20),
    enabled: Boolean(token && projectId),
  })

  const summaryQ = useQuery({
    queryKey: ['project-expense-summary', projectId, token],
    queryFn: () => getProjectExpenseSummary(token, projectId),
    enabled: Boolean(token && projectId),
  })

  const sorted = useMemo(() => {
    const order: Record<ExpenseStatus, number> = {
      PENDIENTE: 0,
      APROBADO: 1,
      RECHAZADO: 2,
    }
    return [...(expensesQ.data?.data ?? [])].sort((a, b) => {
      const d = order[a.status] - order[b.status]
      if (d !== 0) return d
      return new Date(b.expense_date).getTime() - new Date(a.expense_date).getTime()
    })
  }, [expensesQ.data])

  const createM = useMutation({
    mutationFn: async () => {
      const amt = amount.trim().replace(',', '.')
      await createExpense(token, {
        project_id: projectId,
        amount: amt,
        description: concept.trim(),
        expense_date: expDate,
      })
    },
    onSuccess: async () => {
      setFeedback({ text: 'Gasto cargado correctamente.', variant: 'success' })
      setOpen(false)
      setAmount('')
      setConcept('')
      await qc.invalidateQueries({ queryKey: ['project-expenses', projectId] })
      await qc.invalidateQueries({ queryKey: ['project-expense-summary', projectId] })
    },
    onError: (e) =>
      setFeedback({
        text: e instanceof ApiError ? e.message : 'No se pudo crear el gasto',
        variant: 'error',
      }),
  })

  const approveM = useMutation({
    mutationFn: (id: string) => approveExpense(token, id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['project-expenses', projectId] })
      await qc.invalidateQueries({ queryKey: ['project-expense-summary', projectId] })
    },
  })

  const rejectM = useMutation({
    mutationFn: (id: string) => rejectExpense(token, id),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['project-expenses', projectId] })
    },
  })

  return (
    <div className="space-y-4 sm:space-y-6">
      {feedback && <FeedbackBanner message={feedback.text} variant={feedback.variant} />}

      <Card className="rounded-2xl shadow-sm overflow-hidden">
        {/* ── Header con botón ── */}
        <CardHeader className="flex flex-row items-start justify-between gap-3 px-4 sm:px-6 pt-4 sm:pt-5 pb-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 shrink-0">
              <CreditCard className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-base font-bold">Gastos del proyecto</CardTitle>
              <CardDescription className="mt-0.5 text-xs leading-snug">
                Solo los registros <strong className="text-foreground/70">aprobados</strong> suman
                al total.
              </CardDescription>
            </div>
          </div>
          <Button
            size="sm"
            className="shrink-0"
            onClick={() => {
              setFeedback(null)
              setOpen(true)
            }}
          >
            <Plus className="w-4 h-4" />
            <span className="hidden xs:inline ml-1">Nuevo gasto</span>
            <span className="xs:hidden ml-1">Nuevo</span>
          </Button>
        </CardHeader>

        <CardContent className="space-y-4 px-4 sm:px-6 pb-5">
          {/* ── Resumen financiero ── */}
          {summaryQ.data && (
            <div className="rounded-xl border bg-gradient-to-br from-primary/5 via-primary/[0.03] to-transparent p-4 space-y-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-3.5 w-3.5 text-primary shrink-0" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Resumen financiero
                </span>
              </div>

              <div>
                <p className="text-[11px] text-muted-foreground mb-0.5">Total aprobado</p>
                <p className="text-2xl font-bold text-foreground tabular-nums leading-none">
                  $ {formatARS(summaryQ.data.total_approved)}
                  <span className="text-sm font-normal text-muted-foreground ml-1.5">ARS</span>
                </p>
              </div>

              {summaryQ.data.by_month.length > 0 && (
                <div>
                  <p className="text-[11px] text-muted-foreground mb-2">Últimos 6 meses</p>
                  <div className="flex flex-wrap gap-1.5">
                    {summaryQ.data.by_month.slice(-6).map((x) => (
                      <span
                        key={x.month}
                        className="inline-flex items-center gap-1.5 rounded-lg border bg-card px-2.5 py-1 text-xs"
                      >
                        <span className="text-muted-foreground">{formatMonth(x.month)}</span>
                        <span className="font-semibold text-foreground tabular-nums">
                          ${formatARS(x.total)}
                        </span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {summaryQ.data.by_month.length === 0 && (
                <p className="text-xs text-muted-foreground/70">Sin movimientos registrados aún.</p>
              )}
            </div>
          )}

          {/* ── Lista de gastos ── */}
          {expensesQ.isLoading && <ExpenseSkeleton />}

          {expensesQ.isError && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              {expensesQ.error instanceof ApiError
                ? expensesQ.error.message
                : 'Error al cargar los gastos'}
            </div>
          )}

          {!expensesQ.isLoading && !expensesQ.isError && sorted.length === 0 && (
            <div className="flex flex-col items-center gap-3 py-12 text-center border border-dashed rounded-xl">
              <CreditCard className="w-10 h-10 text-muted-foreground/25" />
              <p className="text-sm text-muted-foreground">
                No hay gastos registrados para este proyecto.
              </p>
            </div>
          )}

          {sorted.length > 0 && (
            <div className="space-y-2.5">
              {sorted.map((exp) => (
                <ExpenseRow
                  key={exp.id}
                  exp={exp}
                  viewerUserId={viewerUserId}
                  coordinatorMode={coordinatorMode}
                  token={token}
                  onApprove={() => approveM.mutate(exp.id)}
                  onReject={() => rejectM.mutate(exp.id)}
                  onReceiptDone={async () => {
                    await qc.invalidateQueries({ queryKey: ['project-expenses', projectId] })
                  }}
                  onDeleted={async () => {
                    setFeedback({ text: 'Gasto eliminado.', variant: 'success' })
                    await qc.invalidateQueries({ queryKey: ['project-expenses', projectId] })
                    await qc.invalidateQueries({
                      queryKey: ['project-expense-summary', projectId],
                    })
                  }}
                  approving={approveM.isPending || rejectM.isPending}
                  onFeedback={(t, v) => setFeedback({ text: t, variant: v })}
                />
              ))}
            </div>
          )}

          <PaginationControls
            page={page}
            totalPages={expensesQ.data?.total_pages ?? 1}
            onPageChange={setPage}
          />
        </CardContent>
      </Card>

      {/* ── Dialog: Nuevo gasto ── */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-primary" />
              Cargar gasto
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-1">
            {/* Monto */}
            <div className="space-y-1.5">
              <Label htmlFor="exp-amount" className="text-xs font-semibold">
                Monto
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium select-none">
                  $
                </span>
                <Input
                  id="exp-amount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="1.200,50"
                  className="pl-7"
                  inputMode="decimal"
                />
              </div>
              <p className="text-[11px] text-muted-foreground">En pesos argentinos (ARS). Usá coma o punto decimal.</p>
            </div>

            {/* Fecha */}
            <div className="space-y-1.5">
              <Label htmlFor="exp-date" className="text-xs font-semibold">
                Fecha del gasto
              </Label>
              <Input
                id="exp-date"
                type="date"
                value={expDate}
                onChange={(e) => setExpDate(e.target.value)}
              />
            </div>

            {/* Descripción */}
            <div className="space-y-1.5">
              <Label htmlFor="exp-concept" className="text-xs font-semibold">
                Descripción
              </Label>
              <Textarea
                id="exp-concept"
                rows={3}
                value={concept}
                onChange={(e) => setConcept(e.target.value)}
                placeholder="Ej: Compra de materiales para el módulo…"
                className="resize-none"
              />
            </div>

            <Button
              disabled={createM.isPending}
              className="w-full"
              onClick={() => createM.mutate()}
            >
              {createM.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Guardando…
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-1.5" />
                  Guardar gasto
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// ExpenseRow
// ─────────────────────────────────────────────────────────────────────────────

type RowProps = {
  exp: ExpenseDTO
  viewerUserId: string
  coordinatorMode: boolean
  token: string
  onApprove: () => void
  onReject: () => void
  approving: boolean
  onReceiptDone: () => Promise<void>
  onDeleted: () => Promise<void>
  onFeedback: (t: string, v: 'success' | 'error' | 'info') => void
}

function ExpenseRow({
  exp,
  viewerUserId,
  coordinatorMode,
  token,
  onApprove,
  onReject,
  approving,
  onReceiptDone,
  onDeleted,
  onFeedback,
}: RowProps) {
  const [uploadBusy, setUploadBusy] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const canApprove = coordinatorMode && exp.status === 'PENDIENTE'
  const isOwner = exp.submitted_by_user_id === viewerUserId
  const showUpload = coordinatorMode || (exp.status === 'PENDIENTE' && isOwner)

  async function attachReceipt(file: File) {
    const err = validateReceiptFile(file)
    if (err) {
      onFeedback(err, 'error')
      return
    }
    setUploadBusy(true)
    try {
      await uploadReceipt(token, exp.id, file)
      onFeedback('Comprobante subido correctamente.', 'success')
      await onReceiptDone()
    } catch (e) {
      onFeedback(e instanceof ApiError ? e.message : 'No se pudo subir el comprobante', 'error')
    } finally {
      setUploadBusy(false)
    }
  }

  return (
    <div
      className={cn(
        'rounded-xl border-l-[3px] border border-border bg-card overflow-hidden shadow-sm transition-shadow hover:shadow-md',
        statusBorderClass(exp.status),
      )}
    >
      <div className="px-4 py-3.5 space-y-3">
        {/* ── Fila 1: monto + estado + fecha ── */}
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
          <div className="flex items-center gap-2.5">
            <span className="font-bold text-base tabular-nums text-foreground">
              $ {formatARS(exp.amount)}
            </span>
            <span className="text-sm text-muted-foreground font-normal">{exp.currency}</span>
            <ExpenseStatusBadge status={exp.status} />
          </div>
          <span className="text-xs text-muted-foreground tabular-nums">
            {formatExpenseDate(exp.expense_date)}
          </span>
        </div>

        {/* ── Fila 2: descripción ── */}
        {exp.description && (
          <p className="text-sm text-foreground/80 leading-snug">{exp.description}</p>
        )}

        {/* ── Fila 3: metadata secundaria ── */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {exp.submitter_name && (
            <span>
              Cargado por{' '}
              <span className="font-medium text-foreground/70">{exp.submitter_name}</span>
            </span>
          )}
          {exp.receipt_storage_path && (
            <span className="inline-flex items-center gap-1">
              <ReceiptLink
                token={token}
                expenseId={exp.id}
                storagePath={exp.receipt_storage_path}
                onError={(msg) => onFeedback(msg, 'error')}
              />
            </span>
          )}
          {exp.rejection_reason && (
            <span className="text-destructive font-medium">
              Motivo: {exp.rejection_reason}
            </span>
          )}
        </div>

        {/* ── Fila 4: acciones ── */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-border/40">
          {/* Adjuntar comprobante */}
          {showUpload && (
            <>
              <input
                ref={fileRef}
                id={`rcv-${exp.id}`}
                type="file"
                accept={RECEIPT_ACCEPT}
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (fileRef.current) fileRef.current.value = ''
                  if (f) void attachReceipt(f)
                }}
              />
              <Button
                size="sm"
                variant="outline"
                disabled={uploadBusy}
                onClick={() => fileRef.current?.click()}
                className="gap-1.5"
              >
                {uploadBusy ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Paperclip className="w-3.5 h-3.5" />
                )}
                <span className="hidden sm:inline">
                  {uploadBusy ? 'Subiendo…' : exp.receipt_storage_path ? 'Reemplazar' : 'Adjuntar'}
                </span>
                <span className="sm:hidden">
                  {uploadBusy ? '…' : exp.receipt_storage_path ? 'Reemplazar' : 'Adjuntar'}
                </span>
              </Button>
            </>
          )}

          {/* Editar / Eliminar */}
          <EditExpenseDialog
            token={token}
            exp={exp}
            viewerUserId={viewerUserId}
            coordinatorMode={coordinatorMode}
            onEdited={async () => {
              onFeedback('Gasto editado.', 'success')
              await onReceiptDone()
            }}
            onError={(msg) => onFeedback(msg, 'error')}
          />
          <DeleteExpenseButton
            token={token}
            exp={exp}
            viewerUserId={viewerUserId}
            coordinatorMode={coordinatorMode}
            onDeleted={onDeleted}
            onError={(msg) => onFeedback(msg, 'error')}
          />

          {/* Aprobar / Rechazar — empujar a la derecha */}
          {canApprove && (
            <>
              <div className="flex-1" />
              <Button
                size="sm"
                variant="outline"
                disabled={approving}
                onClick={onReject}
                className="border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/40 gap-1"
              >
                Rechazar
              </Button>
              <Button
                size="sm"
                disabled={approving}
                onClick={onApprove}
                className="bg-emerald-600 hover:bg-emerald-700 text-white dark:bg-emerald-700 dark:hover:bg-emerald-600 gap-1"
              >
                {approving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                Aprobar
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
