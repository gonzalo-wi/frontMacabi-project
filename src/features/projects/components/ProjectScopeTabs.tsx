import type { ReactNode } from 'react'

import { SegmentedTabs } from '@/components/SegmentedTabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

type ScopeProject = { id: string; name: string }

/**
 * Layout de las páginas "Mis X": tabs "Mis X" / "Del proyecto" (solo si coordina
 * algún proyecto) + selector de proyecto. Cada página pasa su contenido propio:
 * `misContent` (filtros + lista) y `projectPanel` (panel del proyecto elegido).
 */
export function ProjectScopeTabs({
  misLabel,
  coordinated,
  hasCoordinated,
  activeTab,
  onTabChange,
  selectedProjectId,
  onProjectChange,
  misContent,
  projectPanel,
}: {
  misLabel: string
  coordinated: ScopeProject[]
  hasCoordinated: boolean
  activeTab: string
  onTabChange: (tab: string) => void
  selectedProjectId: string
  onProjectChange: (id: string) => void
  misContent: ReactNode
  projectPanel: ReactNode
}) {
  return (
    <>
      {hasCoordinated && (
        <SegmentedTabs
          value={activeTab}
          onChange={onTabChange}
          options={[
            { value: 'mis', label: misLabel },
            { value: 'proyecto', label: 'Del proyecto' },
          ]}
        />
      )}

      {hasCoordinated && activeTab === 'proyecto' ? (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground">Proyecto</span>
            <Select value={selectedProjectId} onValueChange={onProjectChange}>
              <SelectTrigger className="h-9 w-[240px]">
                <SelectValue placeholder="Elegí un proyecto" />
              </SelectTrigger>
              <SelectContent>
                {coordinated.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {selectedProjectId && projectPanel}
        </div>
      ) : (
        misContent
      )}
    </>
  )
}
