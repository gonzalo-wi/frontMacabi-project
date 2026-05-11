import { useMemo, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { ProjectDTO } from '@/features/projects/model/types'
import { cn } from '@/lib/utils'

type ProjectPickerProps = {
  projects: ProjectDTO[]
  selected: Set<string>
  onChange: (next: Set<string>) => void
  className?: string
}

/** Estilo alineado a inputs Radix/shadcn sin dependencia extra de checkbox */
function PickerCheckbox({
  id,
  checked,
  onChange,
  labelledBy,
}: {
  id: string
  checked: boolean
  onChange: () => void
  labelledBy?: string
}) {
  return (
    <input
      id={id}
      type="checkbox"
      aria-labelledby={labelledBy}
      checked={checked}
      onChange={() => onChange()}
      className={cn(
        'h-4 w-4 shrink-0 rounded-[4px] border border-input bg-background accent-primary cursor-pointer',
        'focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
      )}
    />
  )
}

export function ProjectPicker({ projects, selected, onChange, className }: ProjectPickerProps) {
  const [q, setQ] = useState('')
  const filtered = useMemo(
    () => projects.filter((p) => p.name.toLowerCase().includes(q.trim().toLowerCase())),
    [projects, q],
  )

  const toggle = (pid: string) => {
    const next = new Set(selected)
    if (next.has(pid)) next.delete(pid)
    else next.add(pid)
    onChange(next)
  }

  const selectFiltered = () => {
    const next = new Set(selected)
    for (const p of filtered) next.add(p.id)
    onChange(next)
  }

  const clearFiltered = () => {
    const next = new Set(selected)
    for (const p of filtered) next.delete(p.id)
    onChange(next)
  }

  /** Todos los proyectos de la lista (no solo el filtro) */
  const selectAllProjects = () => {
    const next = new Set(selected)
    for (const p of projects) next.add(p.id)
    onChange(next)
  }

  const clearAllProjects = () => {
    onChange(new Set())
  }

  const countInFilteredSelected = filtered.filter((p) => selected.has(p.id)).length

  return (
    <div className={cn('space-y-2', className)}>
      <div className="sticky top-0 z-[1] -mx-0.5 bg-background pb-2 pt-0.5">
        <Input
          placeholder="Buscar proyecto…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="h-9"
          aria-controls="project-picker-list"
        />
      </div>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
        <span>
          {selected.size === 0
            ? 'Ninguno seleccionado'
            : `${selected.size} proyecto${selected.size === 1 ? '' : 's'} seleccionado${selected.size === 1 ? '' : 's'}`}
        </span>
        {projects.length > 0 && (
          <>
            <span aria-hidden className="text-border">
              ·
            </span>
            <Button
              type="button"
              variant="link"
              size="sm"
              className="h-auto min-h-0 p-0 text-xs"
              onClick={selectAllProjects}
              disabled={projects.every((p) => selected.has(p.id))}
            >
              Todos ({projects.length})
            </Button>
            <Button
              type="button"
              variant="link"
              size="sm"
              className="h-auto min-h-0 p-0 text-xs"
              onClick={clearAllProjects}
              disabled={selected.size === 0}
            >
              Quitar selección
            </Button>
          </>
        )}
        {filtered.length > 0 && (
          <>
            <span aria-hidden className="text-border">
              ·
            </span>
            <Button
              type="button"
              variant="link"
              size="sm"
              className="h-auto min-h-0 p-0 text-xs"
              onClick={selectFiltered}
            >
              Incluir resultados ({filtered.length})
            </Button>
            <Button
              type="button"
              variant="link"
              size="sm"
              className="h-auto min-h-0 p-0 text-xs"
              onClick={clearFiltered}
              disabled={countInFilteredSelected === 0}
            >
              Quitar resultados ({countInFilteredSelected})
            </Button>
          </>
        )}
      </div>
      <div
        id="project-picker-list"
        role="list"
        className="max-h-[min(20rem,50vh)] overflow-y-auto rounded-md border p-2 space-y-1.5 scroll-py-1"
      >
        {filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2 text-center">
            {q.trim() ? 'Sin coincidencias.' : 'No hay proyectos.'}
          </p>
        ) : (
          filtered.map((p) => {
            const labelId = `pp-${p.id}-name`
            return (
              <label
                key={p.id}
                role="listitem"
                className="flex items-center gap-2.5 text-sm cursor-pointer rounded-md px-1 py-0.5 hover:bg-muted/60"
              >
                <PickerCheckbox
                  id={`pp-${p.id}`}
                  checked={selected.has(p.id)}
                  onChange={() => toggle(p.id)}
                  labelledBy={labelId}
                />
                <span id={labelId}>{p.name}</span>
              </label>
            )
          })
        )}
      </div>
    </div>
  )
}
