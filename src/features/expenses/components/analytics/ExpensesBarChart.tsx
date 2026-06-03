import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

import { formatARS } from '@/lib/currency'

type Item = { bucket: string; total: string }

const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

function bucketLabel(bucket: string, granularity: 'day' | 'month'): string {
  const parts = bucket.split('-')
  if (granularity === 'month') {
    const [y, m] = parts
    return `${MONTHS[Number(m) - 1] ?? m} ${y.slice(2)}`
  }
  const [, m, d] = parts
  return `${d}/${m}`
}

const compact = new Intl.NumberFormat('es-AR', { notation: 'compact', maximumFractionDigits: 1 })

export function ExpensesBarChart({
  data,
  granularity,
}: {
  data: Item[]
  granularity: 'day' | 'month'
}) {
  const chartData = data.map((d) => ({
    label: bucketLabel(d.bucket, granularity),
    total: Number.parseFloat(d.total) || 0,
  }))

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-[260px] text-sm text-muted-foreground">
        Sin gastos aprobados en el rango.
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
        <XAxis dataKey="label" fontSize={11} tickLine={false} axisLine={false} interval="preserveStartEnd" />
        <YAxis
          fontSize={11}
          width={52}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => `$${compact.format(v as number)}`}
        />
        <Tooltip
          formatter={(value) => formatARS(value as number)}
          contentStyle={{ borderRadius: 12, fontSize: 12, border: '1px solid var(--border)' }}
          cursor={{ fill: 'var(--muted)', opacity: 0.4 }}
        />
        <Bar dataKey="total" fill="#2563eb" radius={[4, 4, 0, 0]} maxBarSize={48} />
      </BarChart>
    </ResponsiveContainer>
  )
}
