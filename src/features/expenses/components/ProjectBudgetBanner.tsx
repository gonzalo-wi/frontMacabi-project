import { useState } from 'react'
import { Loader2, Pencil, Wallet } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { getProjectBudget, setProjectBudget } from '@/features/expenses/api/expensesApi'
import { budgetStatus } from '@/features/expenses/lib/budget'
import { ApiError } from '@/lib/api/apiClient'
import { arsToCanonical, canonicalToArs, formatARS, formatArsInput } from '@/lib/currency'
import { cn } from '@/lib/utils'
import { queryKeys } from '@/lib/queryKeys'

const TONE_BAR: Record<string, string> = {
  ok: 'bg-emerald-500',
  warn: 'bg-amber-500',
  over: 'bg-red-500',
  none: 'bg-muted-foreground/30',
}

export function ProjectBudgetBanner({
  token,
  projectId,
  canEdit = false,
}: {
  token: string
  projectId: string
  canEdit?: boolean
}) {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [amount, setAmount] = useState('')
  const [error, setError] = useState<string | null>(null)

  const q = useQuery({
    queryKey: queryKeys.expenses.projectBudget(projectId, token),
    queryFn: () => getProjectBudget(token, projectId),
    enabled: Boolean(token && projectId),
  })

  const saveM = useMutation({
    mutationFn: (monthlyAmount: string | null) => setProjectBudget(token, projectId, monthlyAmount),
    onSuccess: async () => {
      setOpen(false)
      await qc.invalidateQueries({ queryKey: [...queryKeys.expenses.projectBudgetRoot(), projectId] })
    },
    onError: (e) => setError(e instanceof ApiError ? e.message : 'No se pudo guardar el presupuesto'),
  })

  const data = q.data
  const st = data ? budgetStatus(data.current_month_approved, data.monthly_budget) : null

  function openEditor() {
    setError(null)
    setAmount(data?.monthly_budget ? canonicalToArs(data.monthly_budget) : '')
    setOpen(true)
  }

  // Sin presupuesto: el coordinador no ve nada; el admin ve un CTA para definirlo.
  if (st && !st.hasBudget && !canEdit) return null

  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5">
          <Wallet className="h-3.5 w-3.5 text-primary shrink-0" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Presupuesto del mes
          </span>
        </div>
        {canEdit && st && (
          <button
            type="button"
            onClick={openEditor}
            className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
          >
            <Pencil className="w-3 h-3" />
            {st.hasBudget ? 'Editar' : 'Definir'}
          </button>
        )}
      </div>

      {q.isLoading && <div className="h-9 rounded-lg bg-muted/40 animate-pulse" />}

      {st && st.hasBudget && (
        <>
          <div className="flex items-baseline justify-between gap-2 mb-1.5">
            <span className="text-sm font-bold tabular-nums text-foreground">
              {formatARS(st.approved)} <span className="text-muted-foreground font-normal">de {formatARS(st.budget)}</span>
            </span>
            <span
              className={cn(
                'text-xs font-bold tabular-nums',
                st.tone === 'over' ? 'text-red-600' : st.tone === 'warn' ? 'text-amber-600' : 'text-emerald-600',
              )}
            >
              {Math.round(st.pct)}%
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
            <div
              className={cn('h-full rounded-full transition-all', TONE_BAR[st.tone])}
              style={{ width: `${Math.min(st.pct, 100)}%` }}
            />
          </div>
          <p
            className={cn(
              'mt-1.5 text-[11px]',
              st.tone === 'over' ? 'text-red-600 font-medium' : 'text-muted-foreground',
            )}
          >
            {st.tone === 'over'
              ? `Presupuesto superado por ${formatARS(Math.abs(st.remaining))}`
              : `Te quedan ${formatARS(st.remaining)} este mes`}
          </p>
        </>
      )}

      {st && !st.hasBudget && canEdit && (
        <button
          type="button"
          onClick={openEditor}
          className="text-sm text-primary hover:underline"
        >
          Definir presupuesto mensual
        </button>
      )}

      {/* ── Editor (admin) ── */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wallet className="w-4 h-4 text-primary" />
              Presupuesto mensual
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="budget-amount" className="text-xs font-semibold">
                Monto mensual (ARS)
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium select-none">$</span>
                <Input
                  id="budget-amount"
                  value={amount}
                  onChange={(e) => setAmount(formatArsInput(e.target.value))}
                  placeholder="100.000,00"
                  className="pl-7"
                  inputMode="decimal"
                />
              </div>
              <p className="text-[11px] text-muted-foreground">
                Se compara contra lo aprobado del mes en curso. Dejalo vacío para quitar el límite.
              </p>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex items-center justify-between gap-2">
              {data?.monthly_budget ? (
                <Button
                  type="button"
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                  disabled={saveM.isPending}
                  onClick={() => saveM.mutate(null)}
                >
                  Quitar límite
                </Button>
              ) : <span />}
              <Button
                disabled={saveM.isPending}
                onClick={() => {
                  const canonical = arsToCanonical(amount)
                  if (!canonical || Number.parseFloat(canonical) <= 0) {
                    setError('Ingresá un monto válido')
                    return
                  }
                  saveM.mutate(canonical)
                }}
              >
                {saveM.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Guardar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
