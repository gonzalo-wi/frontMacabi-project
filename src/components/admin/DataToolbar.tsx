import type { ReactNode } from 'react'
import { Search } from 'lucide-react'

import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

type DataToolbarProps = {
  search?: string
  onSearch?: (value: string) => void
  searchPlaceholder?: string
  filters?: ReactNode
  countLabel?: ReactNode
  className?: string
}

export function DataToolbar({
  search,
  onSearch,
  searchPlaceholder = 'Buscar',
  filters,
  countLabel,
  className,
}: DataToolbarProps) {
  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex flex-col gap-2 md:flex-row md:items-center">
        {onSearch && (
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search ?? ''}
              onChange={(event) => onSearch(event.target.value)}
              placeholder={searchPlaceholder}
              className="h-10 pl-9"
            />
          </div>
        )}
        {filters && <div className="flex flex-col gap-2 sm:flex-row sm:items-center">{filters}</div>}
      </div>
      {countLabel && <p className="text-xs text-muted-foreground">{countLabel}</p>}
    </div>
  )
}
