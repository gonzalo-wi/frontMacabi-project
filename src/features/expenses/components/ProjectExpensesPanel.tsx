import { useEffect, useMemo, useRef, useState } from 'react'
import { CreditCard, Loader2, Plus } from 'lucide-react'
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
      setFeedback({ text: 'Gasto cargado.', variant: 'success' })
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
    <div className="space-y-6">
      {feedback && <FeedbackBanner message={feedback.text} variant={feedback.variant} />}

      <Card>
        <CardHeader className="flex flex-row gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <CreditCard className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <CardTitle className="text-base">Gastos del proyecto</CardTitle>
            <CardDescription>
              Registro y aprobación de gastos. Los montos suman sólo registros{' '}
              <strong>APROBADO</strong> en el resumen.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {summaryQ.data && (
            <div className="rounded-lg border bg-muted/20 px-4 py-3 text-sm">
              <p className="font-medium tabular-nums">
                Total aprobado — {summaryQ.data.total_approved} ARS
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Serie mensual:{' '}
                {summaryQ.data.by_month.length === 0
                  ? 'sin datos por ahora'
                  : summaryQ.data.by_month
                      .slice(-6)
                      .map((x) => `${x.month}: ${x.total}`)
                      .join(' · ')}
              </p>
            </div>
          )}

          <div className="flex justify-end">
            <Button
              size="sm"
              onClick={() => {
                setFeedback(null)
                setOpen(true)
              }}
            >
              <Plus className="w-4 h-4 mr-1" /> Nuevo gasto
            </Button>
          </div>

          {expensesQ.isLoading && (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          )}
          {expensesQ.isError && (
            <p className="text-sm text-destructive">
              {expensesQ.error instanceof ApiError
                ? expensesQ.error.message
                : 'Error al cargar gastos'}
            </p>
          )}

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
                await qc.invalidateQueries({ queryKey: ['project-expense-summary', projectId] })
              }}
              approving={approveM.isPending || rejectM.isPending}
              onFeedback={(t, v) => setFeedback({ text: t, variant: v })}
            />
          ))}

          {!expensesQ.isLoading && sorted.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              No hay gastos registrados para este proyecto.
            </p>
          )}

          <PaginationControls
            page={page}
            totalPages={expensesQ.data?.total_pages ?? 1}
            onPageChange={setPage}
          />
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Cargar gasto</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Monto</Label>
              <Input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="1200.50" />
            </div>
            <div className="space-y-1.5">
              <Label>Fecha del gasto</Label>
              <Input type="date" value={expDate} onChange={(e) => setExpDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Descripción</Label>
              <Textarea rows={3} value={concept} onChange={(e) => setConcept(e.target.value)} />
            </div>
            <Button disabled={createM.isPending} className="w-full" onClick={() => createM.mutate()}>
              {createM.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Guardar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

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

  async function attachReceipt(file: File) {
    const err = validateReceiptFile(file)
    if (err) {
      onFeedback(err, 'error')
      return
    }
    setUploadBusy(true)
    try {
      await uploadReceipt(token, exp.id, file)
      onFeedback('Comprobante subido.', 'success')
      await onReceiptDone()
    } catch (e) {
      onFeedback(e instanceof ApiError ? e.message : 'No se pudo subir el comprobante', 'error')
    } finally {
      setUploadBusy(false)
    }
  }

  const isOwner = exp.submitted_by_user_id === viewerUserId
  const showUpload =
    coordinatorMode || (exp.status === 'PENDIENTE' && isOwner)

  return (
    <div className="rounded-xl border px-4 py-3 flex flex-wrap items-start gap-3 justify-between">
      <div className="min-w-0 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-medium tabular-nums">{exp.amount} {exp.currency}</p>
          <ExpenseStatusBadge status={exp.status} />
        </div>
        <p className="text-xs text-muted-foreground">{exp.expense_date}</p>
        <p className="text-sm">{exp.description}</p>
        {exp.submitter_name && (
          <p className="text-xs text-muted-foreground">
            Quien cargó — {exp.submitter_name}
          </p>
        )}
        {exp.rejection_reason && (
          <p className="text-xs text-destructive">Motivo: {exp.rejection_reason}</p>
        )}
        {exp.receipt_storage_path && (
          <ReceiptLink
            token={token}
            expenseId={exp.id}
            storagePath={exp.receipt_storage_path}
            onError={(msg) => onFeedback(msg, 'error')}
          />
        )}
      </div>

      <div className="flex flex-col items-end gap-2 shrink-0">
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
              type="button"
              variant="outline"
              disabled={uploadBusy}
              onClick={() => fileRef.current?.click()}
            >
              {uploadBusy ? 'Subiendo…' : 'Adjuntar comprobante'}
            </Button>
          </>
        )}
        <div className="flex items-center gap-1">
          <EditExpenseDialog
            token={token}
            exp={exp}
            viewerUserId={viewerUserId}
            coordinatorMode={coordinatorMode}
            onEdited={async () => {
              onFeedback('Gasto editado.', 'success')
              await onReceiptDone() // reuse for invalidating queries
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
        </div>
        {canApprove && (
          <div className="flex gap-1">
            <Button size="sm" variant="default" disabled={approving} onClick={onApprove}>
              Aprobar
            </Button>
            <Button size="sm" variant="outline" disabled={approving} onClick={onReject}>
              Rechazar
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
