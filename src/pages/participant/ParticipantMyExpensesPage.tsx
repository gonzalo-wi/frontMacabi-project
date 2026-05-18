import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { CreditCard, Loader2, Plus, Search } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { FeedbackBanner } from '@/components/FeedbackBanner'
import { PageHeader } from '@/components/PageHeader'
import { ExpenseStatusBadge } from '@/components/StatusBadge'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
import { Textarea } from '@/components/ui/textarea'
import {
  createExpense,
  listMyExpenses,
  validateReceiptFile,
  RECEIPT_ACCEPT,
} from '@/features/expenses/api/expensesApi'
import { DeleteExpenseButton } from '@/features/expenses/components/DeleteExpenseButton'
import { EditExpenseDialog } from '@/features/expenses/components/EditExpenseDialog'
import { ReceiptLink } from '@/features/expenses/components/ReceiptLink'
import type { ExpenseDTO, ExpenseStatus } from '@/features/expenses/model/types'
import { useMyProjectMemberships } from '@/features/projects/hooks/useMyProjectMemberships'
import { ApiError } from '@/lib/api/apiClient'
import { useAuth } from '@/hooks/useAuth'

function formatMoney(amount: string, currency: string) {
  const n = Number.parseFloat(amount)
  if (Number.isNaN(n)) return `${amount} ${currency}`
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: currency || 'ARS' }).format(
    n,
  )
}

async function fetchAllMyExpenses(token: string): Promise<ExpenseDTO[]> {
  const out: ExpenseDTO[] = []
  let page = 1
  while (page <= 80) {
    const r = await listMyExpenses(token, page, 50)
    out.push(...r.data)
    if (page >= r.total_pages) break
    page++
  }
  return out
}

export default function ParticipantMyExpensesPage() {
  const { token, user, isRestoring } = useAuth()
  const qc = useQueryClient()
  const [searchParams] = useSearchParams()
  const fileRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [projectFilter, setProjectFilter] = useState(searchParams.get('project') ?? 'all')
  const [statusFilter, setStatusFilter] = useState<ExpenseStatus | 'all'>('all')
  const [query, setQuery] = useState('')
  const [projectId, setProjectId] = useState('')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [expenseDate, setExpenseDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [receiptFile, setReceiptFile] = useState<File | null>(null)
  const [feedback, setFeedback] = useState<{
    text: string
    variant: 'success' | 'error' | 'info'
  } | null>(null)
  const [dialogFeedback, setDialogFeedback] = useState<{
    text: string
    variant: 'success' | 'error' | 'info'
  } | null>(null)

  const q = useQuery({
    queryKey: ['my-expenses-global', token],
    queryFn: () => fetchAllMyExpenses(token!),
    enabled: Boolean(token) && !isRestoring,
  })

  const membershipsQ = useMyProjectMemberships(token, user?.id, isRestoring)
  const projectOptions = membershipsQ.data ?? []

  useEffect(() => {
    setProjectFilter(searchParams.get('project') ?? 'all')
  }, [searchParams])

  const sorted = useMemo(() => {
    const order: Record<ExpenseStatus, number> = {
      PENDIENTE: 0,
      APROBADO: 1,
      RECHAZADO: 2,
    }
    return [...(q.data ?? [])].sort((a, b) => {
      const byStatus = order[a.status] - order[b.status]
      if (byStatus !== 0) return byStatus
      return new Date(b.expense_date).getTime() - new Date(a.expense_date).getTime()
    })
  }, [q.data])

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase()
    return sorted.filter((e) => {
      if (projectFilter !== 'all' && e.project_id !== projectFilter) return false
      if (statusFilter !== 'all' && e.status !== statusFilter) return false
      if (!term) return true
      return (
        e.description.toLowerCase().includes(term) ||
        (e.project_name ?? '').toLowerCase().includes(term)
      )
    })
  }, [projectFilter, query, sorted, statusFilter])

  const createM = useMutation({
    mutationFn: async () => {
      if (!token) throw new Error('Sin sesión')
      if (!projectId) throw new Error('Elegí un proyecto')
      const cleanAmount = amount.trim().replace(',', '.')
      if (!cleanAmount) throw new Error('Ingresá un monto')
      if (!description.trim()) throw new Error('Ingresá una descripción')
      if (!expenseDate) throw new Error('Ingresá la fecha')

      if (receiptFile) {
        const receiptErr = validateReceiptFile(receiptFile)
        if (receiptErr) throw new Error(receiptErr)
      }

      await createExpense(
        token,
        {
          project_id: projectId,
          amount: cleanAmount,
          description: description.trim(),
          expense_date: expenseDate,
        },
        receiptFile,
      )
    },
    onSuccess: async () => {
      setDialogFeedback(null)
      setFeedback({ text: 'Gasto cargado correctamente.', variant: 'success' })
      setOpen(false)
      setProjectId('')
      setAmount('')
      setDescription('')
      setExpenseDate(new Date().toISOString().slice(0, 10))
      setReceiptFile(null)
      if (fileRef.current) fileRef.current.value = ''
      await qc.invalidateQueries({ queryKey: ['my-expenses-global'] })
    },
    onError: (e) => {
      const text =
        e instanceof ApiError
          ? e.message
          : e instanceof Error
            ? e.message
            : 'No se pudo cargar el gasto'
      setDialogFeedback({ text, variant: 'error' })
    },
  })

  return (
    <div className="min-h-screen pb-24">
      <PageHeader
        icon={CreditCard}
        title="Gastos"
        subtitle="Todos tus gastos en un solo lugar, siempre asociados a un proyecto."
        action={
          <Button
            size="sm"
            onClick={() => {
              setFeedback(null)
              setDialogFeedback(null)
              setOpen(true)
            }}
            disabled={membershipsQ.isLoading}
          >
            <Plus className="w-4 h-4 mr-1" />
            Cargar gasto
          </Button>
        }
      />

      <div className="p-4 lg:p-6 max-w-5xl mx-auto space-y-5">
      {feedback && <FeedbackBanner message={feedback.text} variant={feedback.variant} />}

      {q.isError && (
        <p className="text-sm text-destructive">
          {q.error instanceof ApiError ? q.error.message : 'No se pudieron cargar tus gastos'}
        </p>
      )}

      {membershipsQ.isError && (
        <p className="text-sm text-destructive">
          {membershipsQ.error instanceof ApiError
            ? membershipsQ.error.message
            : 'No se pudieron cargar tus proyectos'}
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Listado global</CardTitle>
          <CardDescription>
            Filtrá por proyecto o estado. El proyecto se elige al cargar y queda visible en cada fila.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2 md:grid-cols-[1fr_180px_180px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar por descripción o proyecto"
                className="pl-9"
              />
            </div>
            <Select value={projectFilter} onValueChange={setProjectFilter}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Proyecto" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los proyectos</SelectItem>
                {projectOptions.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as ExpenseStatus | 'all')}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="PENDIENTE">Pendiente</SelectItem>
                <SelectItem value="APROBADO">Aprobado</SelectItem>
                <SelectItem value="RECHAZADO">Rechazado</SelectItem>
              </SelectContent>
            </Select>
          </div>

      {q.isPending && (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

          {!q.isPending && filtered.length > 0 && (
            <div className="rounded-xl border overflow-hidden">
              <div className="divide-y">
              {filtered.map((e: ExpenseDTO) => (
                <div key={e.id} className="flex flex-wrap items-start justify-between gap-2 px-4 py-3">
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-sm">{e.description}</p>
                      <Badge variant="outline">
                        {e.project_name?.trim() || 'Proyecto'}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {new Date(`${e.expense_date}T12:00:00`).toLocaleDateString('es-AR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: '2-digit',
                      })}
                    </p>
                    <p className="text-sm tabular-nums font-medium">
                      {formatMoney(e.amount, e.currency)}
                    </p>
                    {e.receipt_storage_path && token && (
                      <ReceiptLink
                        token={token}
                        expenseId={e.id}
                        storagePath={e.receipt_storage_path}
                        onError={(msg) => setFeedback({ text: msg, variant: 'error' })}
                      />
                    )}
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <ExpenseStatusBadge status={e.status} />
                    {token && user && (
                      <div className="flex items-center gap-1">
                        <EditExpenseDialog
                          token={token}
                          exp={e}
                          viewerUserId={user.id}
                          coordinatorMode={false}
                          onEdited={async () => {
                            setFeedback({ text: 'Gasto editado.', variant: 'success' })
                            await qc.invalidateQueries({ queryKey: ['my-expenses-global'] })
                          }}
                          onError={(msg) => setFeedback({ text: msg, variant: 'error' })}
                        />
                        <DeleteExpenseButton
                          token={token}
                          exp={e}
                          viewerUserId={user.id}
                          coordinatorMode={false}
                          onDeleted={async () => {
                            setFeedback({ text: 'Gasto eliminado.', variant: 'success' })
                            await qc.invalidateQueries({ queryKey: ['my-expenses-global'] })
                          }}
                          onError={(msg) => setFeedback({ text: msg, variant: 'error' })}
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))}
              </div>
            </div>
          )}

          {!q.isPending && filtered.length === 0 && !q.isError && (
            <div className="rounded-xl border border-dashed p-8">
              <p className="text-sm text-muted-foreground text-center">
                No hay gastos para los filtros seleccionados.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next)
          if (!next) setDialogFeedback(null)
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Cargar gasto</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {dialogFeedback && (
              <FeedbackBanner message={dialogFeedback.text} variant={dialogFeedback.variant} />
            )}
            <div className="space-y-1.5">
              <Label>Proyecto</Label>
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger className="w-full h-11">
                  <SelectValue placeholder="Elegí un proyecto" />
                </SelectTrigger>
                <SelectContent>
                  {projectOptions.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Monto</Label>
                <Input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="1200.50" />
              </div>
              <div className="space-y-1.5">
                <Label>Fecha</Label>
                <Input type="date" value={expenseDate} onChange={(e) => setExpenseDate(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Descripción</Label>
              <Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Comprobante</Label>
              <Input
                ref={fileRef}
                type="file"
                accept={RECEIPT_ACCEPT}
                onChange={(e) => setReceiptFile(e.target.files?.[0] ?? null)}
              />
              <p className="text-xs text-muted-foreground">Opcional. JPG, PNG, WebP o PDF hasta 2 MB.</p>
            </div>
            <Button disabled={createM.isPending || projectOptions.length === 0} className="w-full" onClick={() => createM.mutate()}>
              {createM.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Guardar gasto'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  )
}
