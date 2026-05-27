import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { CreditCard, Loader2, Plus, Search, Calendar, Paperclip, DollarSign } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { FeedbackBanner } from '@/components/FeedbackBanner'
import { PageHeader } from '@/components/PageHeader'
import { PaginationControls } from '@/components/admin/PaginationControls'
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
import { cn } from '@/lib/utils'

function formatMoney(amount: string, currency: string) {
  const n = Number.parseFloat(amount)
  if (Number.isNaN(n)) return `${amount} ${currency}`
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: currency || 'ARS' }).format(
    n,
  )
}



export default function ParticipantMyExpensesPage() {
  const { token, user, isRestoring } = useAuth()
  const qc = useQueryClient()
  const [searchParams] = useSearchParams()
  const fileRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [page, setPage] = useState(1)
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

  useEffect(() => {
    if (!feedback) return
    const timer = setTimeout(() => setFeedback(null), 4000)
    return () => clearTimeout(timer)
  }, [feedback])

  const [dialogFeedback, setDialogFeedback] = useState<{
    text: string
    variant: 'success' | 'error' | 'info'
  } | null>(null)

  const q = useQuery({
    queryKey: ['my-expenses-global', token, page],
    queryFn: () => listMyExpenses(token!, page, 20),
    enabled: Boolean(token) && !isRestoring,
  })

  const membershipsQ = useMyProjectMemberships(token, user?.id, isRestoring)
  const projectOptions = membershipsQ.data ?? []

  useEffect(() => {
    setProjectFilter(searchParams.get('project') ?? 'all')
  }, [searchParams])

  useEffect(() => {
    setPage(1)
  }, [query, statusFilter, projectFilter])

  const sorted = useMemo(() => {
    const order: Record<ExpenseStatus, number> = {
      PENDIENTE: 0,
      APROBADO: 1,
      RECHAZADO: 2,
    }
    return [...(q.data?.data ?? [])].sort((a, b) => {
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

      <Card className="border border-border/50 bg-card/60 backdrop-blur-md shadow-premium rounded-2xl overflow-hidden">
        <CardHeader className="pb-3 border-b border-border/40">
          <CardTitle className="text-base font-extrabold tracking-tight">Listado global</CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Filtrá por proyecto o estado. El proyecto se elige al cargar y queda visible en cada fila.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5 pt-5">
          <div className="grid gap-2.5 md:grid-cols-[1fr_180px_180px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar por descripción o proyecto..."
                className="pl-9 bg-background/50 focus-visible:ring-primary/30"
              />
            </div>
            <Select value={projectFilter} onValueChange={setProjectFilter}>
              <SelectTrigger className="w-full bg-background/50 focus:ring-primary/30">
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
              <SelectTrigger className="w-full bg-background/50 focus:ring-primary/30">
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
              <Loader2 className="h-7 w-7 animate-spin text-primary" />
            </div>
          )}

          {!q.isPending && filtered.length > 0 && (
            <div className="space-y-3.5">
              {filtered.map((e: ExpenseDTO) => {
                const borderCls =
                  e.status === 'APROBADO'
                    ? 'border-l-emerald-500/80 dark:border-l-emerald-500'
                    : e.status === 'RECHAZADO'
                      ? 'border-l-red-500/80 dark:border-l-red-500'
                      : 'border-l-amber-500/80 dark:border-l-amber-500'

                return (
                  <div
                    key={e.id}
                    className={cn(
                      "flex flex-col gap-3.5 rounded-2xl border border-border/60 bg-card/30 backdrop-blur-xs p-4 sm:p-5 shadow-sm transition-all duration-200 hover:scale-[1.01] hover:shadow-md hover:border-primary/20 border-l-[5px]",
                      borderCls
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1.5 min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="font-extrabold text-sm text-foreground tracking-tight leading-snug break-words">
                            {e.description}
                          </h4>
                          <Badge variant="secondary" className="text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-full bg-secondary/60 border-border/40 text-secondary-foreground">
                            {e.project_name?.trim() || 'Proyecto'}
                          </Badge>
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-muted-foreground/75" />
                            {new Date(`${e.expense_date}T12:00:00`).toLocaleDateString('es-AR', {
                              day: '2-digit',
                              month: '2-digit',
                              year: '2-digit',
                            })}
                          </span>
                          {e.receipt_storage_path && token && (
                            <span className="flex items-center gap-1.5 text-primary">
                              <Paperclip className="w-3.5 h-3.5 text-primary/75" />
                              <ReceiptLink
                                token={token}
                                expenseId={e.id}
                                storagePath={e.receipt_storage_path}
                                onError={(msg) => setFeedback({ text: msg, variant: 'error' })}
                                className="font-semibold text-xs text-primary decoration-primary/30 hover:decoration-primary"
                              />
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="shrink-0">
                        <ExpenseStatusBadge status={e.status} className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5" />
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-3 pt-3 border-t border-border/40 mt-1">
                      <div className="flex items-center gap-1.5">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <DollarSign className="w-4 h-4" />
                        </div>
                        <span className="text-base font-extrabold tabular-nums text-foreground tracking-tight">
                          {formatMoney(e.amount, e.currency)}
                        </span>
                      </div>

                      {token && user && (
                        <div className="flex items-center gap-1.5 bg-background/40 p-1 rounded-xl border border-border/30 backdrop-blur-xs">
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
                );
              })}
            </div>
          )}

          {!q.isPending && filtered.length === 0 && !q.isError && (
            <div className="rounded-2xl border border-dashed border-border/80 p-10 text-center">
              <p className="text-xs text-muted-foreground max-w-xs mx-auto leading-relaxed">
                No hay gastos para los filtros seleccionados.
              </p>
            </div>
          )}

          <PaginationControls
            page={page}
            totalPages={q.data?.total_pages ?? 1}
            onPageChange={setPage}
          />
        </CardContent>
      </Card>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next)
          if (!next) setDialogFeedback(null)
        }}
      >
        <DialogContent className="max-w-md rounded-2xl border border-border/50 bg-card/95 backdrop-blur-lg shadow-premium">
          <DialogHeader className="pb-2 border-b border-border/40">
            <DialogTitle className="text-base font-extrabold tracking-tight">Cargar gasto</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-3">
            {dialogFeedback && (
              <FeedbackBanner message={dialogFeedback.text} variant={dialogFeedback.variant} />
            )}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Proyecto</Label>
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger className="w-full h-11 rounded-xl bg-background/50 border-border/60 focus:ring-primary/30">
                  <SelectValue placeholder="Elegí un proyecto" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {projectOptions.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3.5">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Monto</Label>
                <Input 
                  value={amount} 
                  onChange={(e) => setAmount(e.target.value)} 
                  placeholder="1200.50" 
                  className="h-11 rounded-xl bg-background/50 border-border/60 focus-visible:ring-primary/30"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Fecha</Label>
                <Input 
                  type="date" 
                  value={expenseDate} 
                  onChange={(e) => setExpenseDate(e.target.value)} 
                  className="h-11 rounded-xl bg-background/50 border-border/60 focus-visible:ring-primary/30"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Descripción</Label>
              <Textarea 
                rows={3} 
                value={description} 
                onChange={(e) => setDescription(e.target.value)} 
                placeholder="¿En qué consistió este gasto?"
                className="rounded-xl bg-background/50 border-border/60 focus-visible:ring-primary/30 resize-none"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Comprobante</Label>
              <Input
                ref={fileRef}
                type="file"
                accept={RECEIPT_ACCEPT}
                onChange={(e) => setReceiptFile(e.target.files?.[0] ?? null)}
                className="h-11 rounded-xl bg-background/50 border-border/60 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 text-xs flex items-center"
              />
              <p className="text-[10px] text-muted-foreground leading-normal">Opcional. JPG, PNG, WebP o PDF hasta 2 MB.</p>
            </div>
            <Button 
              disabled={createM.isPending || projectOptions.length === 0} 
              className="w-full h-11 rounded-xl font-bold transition-transform active:scale-[0.98] shadow-sm cursor-pointer mt-1" 
              onClick={() => createM.mutate()}
            >
              {createM.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Guardar gasto'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  )
}
