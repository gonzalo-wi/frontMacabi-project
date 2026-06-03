import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'

import { formatARS } from '@/lib/currency'

const COLORS = [
  '#2563eb',
  '#7c3aed',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#06b6d4',
  '#ec4899',
  '#f97316',
  '#14b8a6',
  '#8b5cf6',
]

type Item = { project_id: string; project_name: string; total: string }

export function ExpensesByProjectPie({ data }: { data: Item[] }) {
  const chartData = data
    .map((d) => ({ name: d.project_name, value: Number.parseFloat(d.total) || 0 }))
    .filter((d) => d.value > 0)

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-[260px] text-sm text-muted-foreground">
        Sin gastos aprobados en el rango.
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie
          data={chartData}
          dataKey="value"
          nameKey="name"
          innerRadius={55}
          outerRadius={90}
          paddingAngle={2}
          stroke="none"
        >
          {chartData.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value) => formatARS(value as number)}
          contentStyle={{ borderRadius: 12, fontSize: 12, border: '1px solid var(--border)' }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  )
}
