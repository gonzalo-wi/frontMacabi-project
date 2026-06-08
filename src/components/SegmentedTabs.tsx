import { cn } from '@/lib/utils'

type SegmentedTabOption<T extends string> = { value: T; label: string }

type SegmentedTabsProps<T extends string> = {
  value: T
  onChange: (value: T) => void
  options: SegmentedTabOption<T>[]
  className?: string
}

/** Barra de solapas segmentada (pill toggle). */
export function SegmentedTabs<T extends string>({
  value,
  onChange,
  options,
  className,
}: SegmentedTabsProps<T>) {
  return (
    <div className={cn('inline-flex rounded-xl border border-border/70 bg-muted/30 p-1', className)}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            'rounded-lg px-3.5 py-1.5 text-sm font-semibold transition-colors',
            value === o.value
              ? 'bg-background shadow-sm text-foreground'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
