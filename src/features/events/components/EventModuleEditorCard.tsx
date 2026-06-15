import { useEffect, useRef, useState } from 'react'
import { ChevronDown, Trash2 } from 'lucide-react'

import { ConfirmDialog } from '@/components/ConfirmDialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  patchEventModule,
  patchOption,
  patchOptionGroup,
  setEventModuleProjects,
} from '@/features/events/api/eventsApi'
import { labelModuleType } from '@/features/events/lib/eventLabels'
import type { ModuleDetailDTO } from '@/features/events/model/types'
import type { ProjectDTO } from '@/features/projects/model/types'
import { ProjectPicker } from '@/features/projects/components/ProjectPicker'
import { cn } from '@/lib/utils'

import { EventModuleGroupEditor } from './EventModuleGroupEditor'
import {
  initialGroupStates,
  initialOptionStates,
  isGroupDirty,
  isOptionDirty,
  MODULE_TYPES,
  type GroupState,
  type OptionState,
} from './eventModuleEditorState'

export function EventModuleEditorCard({
  md,
  projects,
  token,
  anchorId,
  defaultOpen,
  onDeleteModule,
  onAddGroup,
  onAddOption,
  onSaved,
  onRegisterSaver,
  onDirtyChange,
}: {
  md: ModuleDetailDTO
  projects: ProjectDTO[]
  token: string
  anchorId?: string
  defaultOpen?: boolean
  onDeleteModule: () => void
  onAddGroup: () => void
  onAddOption: (groupId: string) => void
  onSaved: () => void
  onRegisterSaver?: (fn: () => Promise<void>) => () => void
  onDirtyChange?: (dirty: boolean) => void
}) {
  const m = md.module

  const [local, setLocal] = useState({
    title: m.title,
    type: m.type,
    sort: String(m.sort_order),
    required: m.is_required,
  })

  const [mProj, setMProj] = useState<Set<string>>(new Set(md.project_ids))
  const [groupStates, setGroupStates] = useState<Map<string, GroupState>>(() => initialGroupStates(md))
  const [optionStates, setOptionStates] = useState<Map<string, OptionState>>(() => initialOptionStates(md))
  const [expanded, setExpanded] = useState(() => defaultOpen !== false)
  const [vizOpen, setVizOpen] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const moduleDirty =
    local.title !== m.title ||
    local.type !== m.type ||
    String(m.sort_order) !== local.sort ||
    local.required !== m.is_required

  const visBasis = [...md.project_ids].sort().join(',')
  const visNow = [...mProj].sort().join(',')
  const visibilityDirty = visBasis !== visNow

  const groupsDirty = md.option_groups.some((gd) => {
    const gs = groupStates.get(gd.group.id)
    return gs ? isGroupDirty(gs, gd.group) : false
  })

  const optionsDirty = md.option_groups.some((gd) =>
    gd.options.some((o) => {
      const os = optionStates.get(o.id)
      return os ? isOptionDirty(os, o) : false
    }),
  )

  const anyDirty = moduleDirty || groupsDirty || optionsDirty || visibilityDirty

  const handleSaveAll = async () => {
    setSaveError(null)
    try {
      const calls: Promise<unknown>[] = []

      if (moduleDirty) {
        calls.push(
          patchEventModule(token, m.id, {
            title: local.title,
            type: local.type,
            sort_order: Number(local.sort) || 0,
            is_required: local.required,
          }),
        )
      }

      for (const gd of md.option_groups) {
        const gs = groupStates.get(gd.group.id)
        if (gs && isGroupDirty(gs, gd.group)) {
          calls.push(
            patchOptionGroup(token, gd.group.id, {
              name: gs.name,
              type: gs.type,
              sort_order: gd.group.sort_order,
              is_required: gs.required,
            }),
          )
        }
        for (const o of gd.options) {
          const os = optionStates.get(o.id)
          if (os && isOptionDirty(os, o)) {
            calls.push(
              patchOption(token, o.id, {
                label: os.label,
                max_capacity: os.cap === '' ? null : Number(os.cap),
                sort_order: o.sort_order,
              }),
            )
          }
        }
      }

      if (visibilityDirty) {
        calls.push(setEventModuleProjects(token, m.id, { project_ids: [...mProj] }))
      }

      await Promise.all(calls)
      onSaved()
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Error al guardar')
      throw e
    }
  }

  /* eslint-disable react-hooks/refs -- latest-ref pattern for stable registration */
  const saveRef = useRef(handleSaveAll)
  saveRef.current = handleSaveAll
  /* eslint-enable react-hooks/refs */

  useEffect(() => {
    if (!onRegisterSaver) return
    return onRegisterSaver(() => saveRef.current())
  }, [onRegisterSaver])

  useEffect(() => {
    onDirtyChange?.(anyDirty)
  }, [anyDirty, onDirtyChange])

  const setGroup = (gid: string, patch: Partial<GroupState>) =>
    setGroupStates((prev) => {
      const next = new Map(prev)
      let cur = next.get(gid)
      if (!cur) {
        const gd = md.option_groups.find((x) => x.group.id === gid)
        if (!gd) return prev
        cur = {
          name: gd.group.name,
          type: gd.group.type,
          required: gd.group.is_required,
        }
      }
      next.set(gid, { ...cur, ...patch })
      return next
    })

  const setOption = (oid: string, patch: Partial<OptionState>) =>
    setOptionStates((prev) => {
      const next = new Map(prev)
      let cur = next.get(oid)
      if (!cur) {
        for (const gd of md.option_groups) {
          const o = gd.options.find((x) => x.id === oid)
          if (o) {
            cur = {
              label: o.label,
              cap: o.max_capacity != null ? String(o.max_capacity) : '',
            }
            break
          }
        }
      }
      if (!cur) return prev
      next.set(oid, { ...cur, ...patch })
      return next
    })

  return (
    <Collapsible
      id={anchorId}
      open={expanded}
      onOpenChange={setExpanded}
      className={cn(
        'rounded-xl border border-border bg-card scroll-mt-28',
        expanded && 'shadow-sm',
      )}
    >
      <div className="flex items-start justify-between gap-2 p-4">
        <CollapsibleTrigger asChild>
          <button type="button" className="flex min-w-0 flex-1 items-start gap-2 text-left">
            <ChevronDown
              className={cn(
                'mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform',
                expanded && 'rotate-180',
              )}
            />
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-sm truncate">{local.title || m.title}</span>
                <Badge variant="secondary" className="text-[10px] font-normal">
                  {labelModuleType(local.type)}
                </Badge>
                {anyDirty && (
                  <Badge
                    variant="outline"
                    className="text-[10px] font-normal border-amber-600/50 text-amber-900 dark:text-amber-200"
                  >
                    Sin guardar
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Orden {local.sort !== '' ? local.sort : m.sort_order}
                {local.required ? ' · Obligatorio' : ''}
              </p>
            </div>
          </button>
        </CollapsibleTrigger>

        <ConfirmDialog
          trigger={
            <Button
              size="icon"
              variant="ghost"
              className="shrink-0 text-destructive"
              aria-label="Eliminar módulo"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          }
          title="¿Eliminar módulo?"
          description="Se eliminarán también todos los grupos de opciones y las opciones dentro del módulo. Esta acción no se puede deshacer."
          confirmLabel="Eliminar"
          destructive
          onConfirm={onDeleteModule}
        />
      </div>

      <CollapsibleContent>
        <Card className="border-0 shadow-none rounded-none rounded-b-xl">
          <CardContent className="space-y-4 pt-0 px-4 pb-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor={`${anchorId}-title`}>Título</Label>
                <Input
                  id={`${anchorId}-title`}
                  value={local.title}
                  onChange={(e) => setLocal((s) => ({ ...s, title: e.target.value }))}
                  className="h-10"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`${anchorId}-type`}>Tipo</Label>
                <Select
                  value={local.type}
                  onValueChange={(v) => setLocal((s) => ({ ...s, type: v }))}
                >
                  <SelectTrigger id={`${anchorId}-type`} className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MODULE_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {labelModuleType(t)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`${anchorId}-sort`}>Orden</Label>
                <Input
                  id={`${anchorId}-sort`}
                  value={local.sort}
                  onChange={(e) => setLocal((s) => ({ ...s, sort: e.target.value }))}
                  className="h-10"
                  inputMode="numeric"
                />
              </div>
              <label className="flex items-center gap-2 text-sm pt-7">
                <input
                  type="checkbox"
                  className="rounded border-input"
                  checked={local.required}
                  onChange={(e) => setLocal((s) => ({ ...s, required: e.target.checked }))}
                />
                Obligatorio
              </label>
            </div>

            <Collapsible
              open={vizOpen}
              onOpenChange={setVizOpen}
              className="rounded-lg border bg-muted/20 overflow-hidden"
            >
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className="flex w-full items-start gap-2 px-3 py-2.5 text-left hover:bg-muted/35 transition-colors"
                >
                  <ChevronDown
                    className={cn(
                      'mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform',
                      vizOpen && 'rotate-180',
                    )}
                  />
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <span className="text-sm font-medium text-foreground">
                      Visibilidad por proyecto
                    </span>
                    <p className="text-xs text-muted-foreground leading-snug">
                      {mProj.size === 0
                        ? 'Visible para todos los proyectos participantes de esta jornada.'
                        : `Restringido a ${mProj.size} proyecto${mProj.size === 1 ? '' : 's'}.`}
                    </p>
                  </div>
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="space-y-2 border-t border-border/80 bg-muted/10 px-3 py-3">
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Opcional: limitá este bloque a proyectos específicos. Si no marcás ninguno, lo
                    ven todos los proyectos con acceso a la jornada.
                  </p>
                  <ProjectPicker projects={projects} selected={mProj} onChange={setMProj} />
                </div>
              </CollapsibleContent>
            </Collapsible>

            <div className="space-y-3 border-t pt-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Grupos de opciones
                </p>
                <Button size="sm" variant="outline" onClick={onAddGroup}>
                  + Grupo
                </Button>
              </div>
              {[...md.option_groups]
                .sort((a, b) => a.group.sort_order - b.group.sort_order)
                .map((gd) => {
                  const gs = groupStates.get(gd.group.id) ?? {
                    name: gd.group.name,
                    type: gd.group.type,
                    required: gd.group.is_required,
                  }
                  return (
                    <EventModuleGroupEditor
                      key={gd.group.id}
                      gd={gd}
                      state={gs}
                      optionStates={optionStates}
                      token={token}
                      onGroupChange={(patch) => setGroup(gd.group.id, patch)}
                      onOptionChange={setOption}
                      onAddOption={() => onAddOption(gd.group.id)}
                      onDeleted={onSaved}
                    />
                  )
                })}
            </div>

            {saveError && (
              <p className="text-xs text-destructive border-t pt-3">{saveError}</p>
            )}
          </CardContent>
        </Card>
      </CollapsibleContent>
    </Collapsible>
  )
}
