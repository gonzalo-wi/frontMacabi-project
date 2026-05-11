import { useEffect, useRef, useState } from 'react'
import { ChevronDown, Trash2 } from 'lucide-react'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
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
  deleteOption,
  deleteOptionGroup,
  patchEventModule,
  patchOption,
  patchOptionGroup,
  setEventModuleProjects,
} from '@/features/events/api/eventsApi'
import { labelGroupType, labelModuleType } from '@/features/events/lib/eventLabels'
import type { EventOptionDTO, EventOptionGroupDTO, GroupDetailDTO, ModuleDetailDTO } from '@/features/events/model/types'
import type { ProjectDTO } from '@/features/projects/model/types'
import { ProjectPicker } from '@/features/projects/components/ProjectPicker'
import { cn } from '@/lib/utils'

const MODULE_TYPES = ['attendance', 'meal', 'transport', 'materials', 'custom'] as const
const GROUP_TYPES = ['single_choice', 'multiple_choice', 'text', 'number'] as const

// ── Types ─────────────────────────────────────────────────────────────────────

type GroupState = { name: string; type: string; required: boolean }
type OptionState = { label: string; cap: string }

function isGroupDirty(gs: GroupState, g: EventOptionGroupDTO) {
  return gs.name !== g.name || gs.type !== g.type || gs.required !== g.is_required
}

function isOptionDirty(os: OptionState, o: EventOptionDTO) {
  const capNum = os.cap === '' ? null : Number(os.cap)
  return os.label !== o.label || capNum !== o.max_capacity
}

// ── EventModuleEditorCard ─────────────────────────────────────────────────────

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

  // ── Module header state ───────────────────────────────────────────────────
  const [local, setLocal] = useState({
    title: m.title,
    type: m.type,
    sort: String(m.sort_order),
    required: m.is_required,
  })

  // ── Visibility state ──────────────────────────────────────────────────────
  const [mProj, setMProj] = useState<Set<string>>(new Set(md.project_ids))

  // ── Group states ──────────────────────────────────────────────────────────
  const [groupStates, setGroupStates] = useState<Map<string, GroupState>>(() => {
    const map = new Map<string, GroupState>()
    for (const gd of md.option_groups) {
      map.set(gd.group.id, {
        name: gd.group.name,
        type: gd.group.type,
        required: gd.group.is_required,
      })
    }
    return map
  })

  // ── Option states ─────────────────────────────────────────────────────────
  const [optionStates, setOptionStates] = useState<Map<string, OptionState>>(() => {
    const map = new Map<string, OptionState>()
    for (const gd of md.option_groups) {
      for (const o of gd.options) {
        map.set(o.id, {
          label: o.label,
          cap: o.max_capacity != null ? String(o.max_capacity) : '',
        })
      }
    }
    return map
  })

  // ── UI state ──────────────────────────────────────────────────────────────
  const [expanded, setExpanded] = useState(() => defaultOpen !== false)
  const [vizOpen, setVizOpen] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // ── Dirty detection ───────────────────────────────────────────────────────
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

  // ── Save all ──────────────────────────────────────────────────────────────
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

  // Ref actualizado cada render para que onRegisterSaver siempre llame al guardado más reciente.
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

  // ── Helpers ───────────────────────────────────────────────────────────────
  // Groups/options creados vía API se agregan a `md` tras refetch pero no al Map
  // del useState inicial: sin baseline, setGroup/setOption ignoraban el cambio.
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

  // ── Render ────────────────────────────────────────────────────────────────
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
      {/* Header */}
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

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              size="icon"
              variant="ghost"
              className="shrink-0 text-destructive"
              aria-label="Eliminar módulo"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Eliminar módulo?</AlertDialogTitle>
              <AlertDialogDescription>
                Se eliminarán también todos los grupos de opciones y las opciones dentro del módulo.
                Esta acción no se puede deshacer.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground"
                onClick={onDeleteModule}
              >
                Eliminar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <CollapsibleContent>
        <Card className="border-0 shadow-none rounded-none rounded-b-xl">
          <CardContent className="space-y-4 pt-0 px-4 pb-4">
            {/* Module fields */}
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

            {/* Visibility */}
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

            {/* Groups */}
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
                    <GroupEditor
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

// ── GroupEditor ───────────────────────────────────────────────────────────────

function GroupEditor({
  gd,
  state,
  optionStates,
  token,
  onGroupChange,
  onOptionChange,
  onAddOption,
  onDeleted,
}: {
  gd: GroupDetailDTO
  state: GroupState
  optionStates: Map<string, OptionState>
  token: string
  onGroupChange: (patch: Partial<GroupState>) => void
  onOptionChange: (optionId: string, patch: Partial<OptionState>) => void
  onAddOption: () => void
  onDeleted: () => void
}) {
  const g = gd.group
  const isChoice = state.type === 'single_choice' || state.type === 'multiple_choice'
  const groupHasResponses = gd.options.some((o) => o.current_count > 0)

  const handleDeleteGroup = async () => {
    await deleteOptionGroup(token, g.id)
    onDeleted()
  }

  return (
    <div className="rounded-lg border p-3 space-y-3 bg-muted/15">
      {/* Group header row */}
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide pt-0.5">
          {state.name || g.name}
        </span>
        {groupHasResponses ? (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6 shrink-0 text-destructive/70 hover:text-destructive"
                aria-label="Eliminar grupo"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Eliminar grupo?</AlertDialogTitle>
                <AlertDialogDescription>
                  Este grupo tiene respuestas registradas. Se eliminarán el grupo, sus opciones y
                  todos los datos de respuesta asociados. Esta acción no se puede deshacer.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground"
                  onClick={handleDeleteGroup}
                >
                  Eliminar igualmente
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : (
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6 shrink-0 text-destructive/70 hover:text-destructive"
            aria-label="Eliminar grupo"
            onClick={handleDeleteGroup}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        )}
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <div className="space-y-1">
          <Label className="text-xs">Nombre</Label>
          <Input
            value={state.name}
            onChange={(e) => onGroupChange({ name: e.target.value })}
            className="h-9"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Tipo</Label>
          <Select value={state.type} onValueChange={(v) => onGroupChange({ type: v })}>
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {GROUP_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {labelGroupType(t)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <label className="flex items-center gap-2 text-xs">
        <input
          type="checkbox"
          className="rounded border-input"
          checked={state.required}
          onChange={(e) => onGroupChange({ required: e.target.checked })}
        />
        Obligatorio
      </label>

      {/* Options */}
      <div className="space-y-2 border-t pt-2">
        <div className="flex justify-between items-center">
          <span className="text-xs font-medium">Opciones</span>
          {isChoice && (
            <Button size="sm" variant="ghost" onClick={onAddOption}>
              + Opción
            </Button>
          )}
        </div>
        {isChoice &&
          [...gd.options]
            .sort((a, b) => a.sort_order - b.sort_order)
            .map((o) => {
              const os = optionStates.get(o.id) ?? {
                label: o.label,
                cap: o.max_capacity != null ? String(o.max_capacity) : '',
              }
              return (
                <div key={o.id} className="flex flex-wrap gap-2 items-center">
                  <Input
                    value={os.label}
                    onChange={(e) => onOptionChange(o.id, { label: e.target.value })}
                    className="h-9 flex-1 min-w-[120px]"
                  />
                  <Input
                    value={os.cap}
                    onChange={(e) => onOptionChange(o.id, { cap: e.target.value })}
                    placeholder="cupo"
                    className="h-9 w-24"
                    type="number"
                  />
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    {o.current_count} usados
                  </span>
                  {o.current_count > 0 ? (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 shrink-0 text-destructive/60 hover:text-destructive"
                          aria-label="Eliminar opción"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>¿Eliminar opción?</AlertDialogTitle>
                          <AlertDialogDescription>
                            "{o.label}" tiene {o.current_count} respuesta
                            {o.current_count === 1 ? '' : 's'} registrada
                            {o.current_count === 1 ? '' : 's'}. Al eliminarla se perderán esos
                            datos. Esta acción no se puede deshacer.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-destructive text-destructive-foreground"
                            onClick={async () => {
                              await deleteOption(token, o.id)
                              onDeleted()
                            }}
                          >
                            Eliminar igualmente
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  ) : (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 shrink-0 text-destructive/60 hover:text-destructive"
                      aria-label="Eliminar opción"
                      onClick={async () => {
                        await deleteOption(token, o.id)
                        onDeleted()
                      }}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              )
            })}
        {!isChoice && (
          <p className="text-xs text-muted-foreground">Respuesta libre del participante.</p>
        )}
      </div>
    </div>
  )
}
