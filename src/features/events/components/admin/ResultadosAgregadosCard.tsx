import { useState } from 'react'
import { BarChart2, ChevronDown } from 'lucide-react'

import { SkeletonRows } from '@/components/data/SkeletonRows'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { ModuleResponseSummaryDTO } from '@/features/events/model/types'
import { cn } from '@/lib/utils'

import { StatChip } from './StatChip'

type ModuleRow = { module: { id: string; sort_order: number } }

/** Resultados agregados por módulo (barras de opciones + respuestas de texto). */
export function ResultadosAgregadosCard({
  modules,
  totalResponses,
  summariesByModuleId,
  summariesLoading,
}: {
  modules: ModuleRow[]
  totalResponses: number
  summariesByModuleId: Map<string, ModuleResponseSummaryDTO>
  summariesLoading: boolean
}) {
  const [expandedOptions, setExpandedOptions] = useState<Set<string>>(new Set())

  return (
    <Card className="rounded-2xl shadow-sm border overflow-hidden">
      <CardHeader className="pb-2 px-4 sm:px-6 pt-4 sm:pt-5">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <BarChart2 className="w-4 h-4 shrink-0 text-primary" />
            Resultados agregados
          </CardTitle>
          <StatChip color="neutral">
            {totalResponses} respuesta{totalResponses !== 1 && 's'}
          </StatChip>
        </div>
      </CardHeader>

      <CardContent className="space-y-6 pt-2 px-4 sm:px-6 pb-5">
        {summariesLoading && <SkeletonRows count={2} />}

        {!summariesLoading &&
          [...modules]
            .sort((a, b) => a.module.sort_order - b.module.sort_order)
            .map((md) => {
              const summary = summariesByModuleId.get(md.module.id)
              if (!summary) return null
              const groups = summary.groups
              if (groups.length === 0) return null

              return (
                <div key={md.module.id} className="space-y-4">
                  {/* Separador de módulo */}
                  <div className="flex items-center gap-3">
                    <div className="h-px flex-1 bg-border" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-1 shrink-0">
                      {summary.module.title}
                    </span>
                    <div className="h-px flex-1 bg-border" />
                  </div>

                  <div className="space-y-5">
                    {groups.map((g, gi) => {
                      const isChoice = g.type === 'single_choice' || g.type === 'multiple_choice'

                      if (isChoice) {
                        const maxCount = Math.max(...g.options.map((o) => o.count), 1)
                        return (
                          <div key={g.id ?? gi} className="space-y-2">
                            <p className="text-xs font-semibold text-foreground/70">{g.name}</p>
                            <div className="space-y-2">
                              {g.options.map((o, oi) => {
                                const pct =
                                  totalResponses > 0
                                    ? Math.round((o.count / totalResponses) * 100)
                                    : 0
                                const barPct = Math.round((o.count / maxCount) * 100)
                                const optKey = `${md.module.id}-${gi}-${oi}`
                                const isExpanded = expandedOptions.has(optKey)
                                const hasUsers = o.users.length > 0

                                return (
                                  <div key={o.id ?? oi}>
                                    <div
                                      className={cn(
                                        'flex items-center gap-2 sm:gap-3 rounded-xl px-2 py-1 -mx-2 transition-colors',
                                        hasUsers
                                          ? 'cursor-pointer hover:bg-muted/40 active:bg-muted/60'
                                          : '',
                                      )}
                                      onClick={
                                        hasUsers
                                          ? () =>
                                              setExpandedOptions((prev) => {
                                                const next = new Set(prev)
                                                if (next.has(optKey)) next.delete(optKey)
                                                else next.add(optKey)
                                                return next
                                              })
                                          : undefined
                                      }
                                    >
                                      <span className="w-20 sm:w-32 shrink-0 text-xs sm:text-sm text-foreground/85 leading-tight">
                                        {o.label}
                                      </span>

                                      <div className="flex-1 h-5 rounded-full bg-muted/60 overflow-hidden min-w-0">
                                        <div
                                          className="h-full rounded-full bg-primary/65 transition-all duration-500"
                                          style={{ width: `${barPct}%` }}
                                        />
                                      </div>

                                      <div className="flex items-baseline gap-1 shrink-0 min-w-[3.5rem] justify-end">
                                        <span className="text-sm font-bold text-foreground tabular-nums">
                                          {o.count}
                                        </span>
                                        <span className="text-[10px] text-muted-foreground tabular-nums hidden sm:inline">
                                          ({pct}%)
                                        </span>
                                      </div>

                                      {hasUsers && (
                                        <ChevronDown
                                          className={cn(
                                            'h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform duration-200',
                                            isExpanded && 'rotate-180',
                                          )}
                                        />
                                      )}
                                    </div>

                                    {hasUsers && isExpanded && (
                                      <div className="flex flex-wrap gap-1 pt-1.5 pb-1 pl-3 sm:pl-36">
                                        {o.users.map((u, ui) => (
                                          <span
                                            key={ui}
                                            className="text-[10px] text-muted-foreground bg-muted/70 border border-border/50 rounded-full px-2 py-0.5"
                                            title={u.user_email}
                                          >
                                            {u.user_name}
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )
                      }

                      if (g.text_answers.length === 0) return null
                      return (
                        <div key={g.id ?? gi} className="space-y-2">
                          <p className="text-xs font-semibold text-foreground/70">{g.name}</p>
                          <div className="flex flex-wrap gap-1.5">
                            {g.text_answers.map((ta, tai) => (
                              <span
                                key={tai}
                                className="rounded-xl border bg-muted/40 px-2.5 py-1 text-xs leading-tight"
                                title={ta.user.user_name}
                              >
                                {ta.value}
                              </span>
                            ))}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
      </CardContent>
    </Card>
  )
}
