import type { ComponentProps } from 'react'
import { BarChart3 } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ExpensesByProjectPie } from '@/features/expenses/components/analytics/ExpensesByProjectPie'
import { ExpensesBarChart } from '@/features/expenses/components/analytics/ExpensesBarChart'

type Granularity = ComponentProps<typeof ExpensesBarChart>['granularity']

export function AnalyticsCard({
  byProject,
  byBucket,
  granularity,
  isLoading,
  isError,
}: {
  byProject: ComponentProps<typeof ExpensesByProjectPie>['data']
  byBucket: ComponentProps<typeof ExpensesBarChart>['data']
  granularity: Granularity
  isLoading: boolean
  isError: boolean
}) {
  return (
    <Card className="rounded-2xl shadow-sm overflow-hidden">
      <CardHeader className="px-4 sm:px-6 pt-4 sm:pt-5 pb-3">
        <CardTitle className="text-base font-bold flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-primary shrink-0" />
          Análisis del período
        </CardTitle>
        <CardDescription className="mt-0.5 text-xs">
          Montos aprobados. Barras por día si el rango ≤ 62 días, o por mes si es mayor.
        </CardDescription>
      </CardHeader>
      <CardContent className="px-4 sm:px-6 pb-5">
        {isError && <p className="text-sm text-destructive">No se pudo cargar el análisis.</p>}
        {isLoading ? (
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="h-[260px] rounded-xl bg-muted/40 animate-pulse" />
            <div className="h-[260px] rounded-xl bg-muted/40 animate-pulse" />
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2">Por proyecto</p>
              <ExpensesByProjectPie data={byProject} />
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2">
                Por {granularity === 'day' ? 'día' : 'mes'}
              </p>
              <ExpensesBarChart data={byBucket} granularity={granularity} />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
