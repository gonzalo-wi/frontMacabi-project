export type BudgetTone = 'none' | 'ok' | 'warn' | 'over'

export interface BudgetStatus {
  hasBudget: boolean
  budget: number
  approved: number
  /** % usado (0–∞). 0 si no hay presupuesto. */
  pct: number
  tone: BudgetTone
  /** Restante (budget - approved). Negativo si se pasó. */
  remaining: number
}

/** Verde <80%, amarillo 80–100%, rojo >100%. */
export function budgetStatus(approvedStr: string, budgetStr: string | null): BudgetStatus {
  const approved = Number.parseFloat(approvedStr) || 0
  const budget = budgetStr != null ? Number.parseFloat(budgetStr) || 0 : 0
  if (budgetStr == null || budget <= 0) {
    return { hasBudget: false, budget: 0, approved, pct: 0, tone: 'none', remaining: 0 }
  }
  const pct = (approved / budget) * 100
  const tone: BudgetTone = pct > 100 ? 'over' : pct >= 80 ? 'warn' : 'ok'
  return { hasBudget: true, budget, approved, pct, tone, remaining: budget - approved }
}

/** ¿Aprobar `amount` haría superar el presupuesto del mes? (solo si el gasto es del mes actual) */
export function wouldExceedBudget(
  approvedStr: string,
  budgetStr: string | null,
  amount: string,
  expenseDate: string,
  currentMonth: string, // "YYYY-MM"
): { exceeds: boolean; projected: number; budget: number } {
  const budget = budgetStr != null ? Number.parseFloat(budgetStr) || 0 : 0
  const approved = Number.parseFloat(approvedStr) || 0
  const amt = Number.parseFloat(amount) || 0
  const isCurrentMonth = expenseDate.slice(0, 7) === currentMonth
  const projected = approved + amt
  const exceeds = budget > 0 && isCurrentMonth && projected > budget
  return { exceeds, projected, budget }
}
