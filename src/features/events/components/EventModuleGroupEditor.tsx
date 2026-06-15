import { Trash2 } from 'lucide-react'

import { ConfirmDialog } from '@/components/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { deleteOption, deleteOptionGroup } from '@/features/events/api/eventsApi'
import { labelGroupType } from '@/features/events/lib/eventLabels'
import type { GroupDetailDTO } from '@/features/events/model/types'

import { GROUP_TYPES, type GroupState, type OptionState } from './eventModuleEditorState'

export function EventModuleGroupEditor({
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

  const deleteGroupButton = (
    <Button
      size="icon"
      variant="ghost"
      className="h-6 w-6 shrink-0 text-destructive/70 hover:text-destructive"
      aria-label="Eliminar grupo"
      {...(!groupHasResponses ? { onClick: handleDeleteGroup } : {})}
    >
      <Trash2 className="w-3.5 h-3.5" />
    </Button>
  )

  return (
    <div className="rounded-lg border p-3 space-y-3 bg-muted/15">
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide pt-0.5">
          {state.name || g.name}
        </span>
        {groupHasResponses ? (
          <ConfirmDialog
            trigger={deleteGroupButton}
            title="¿Eliminar grupo?"
            description="Este grupo tiene respuestas registradas. Se eliminarán el grupo, sus opciones y todos los datos de respuesta asociados. Esta acción no se puede deshacer."
            confirmLabel="Eliminar igualmente"
            destructive
            onConfirm={handleDeleteGroup}
          />
        ) : (
          deleteGroupButton
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
              const handleDeleteOption = async () => {
                await deleteOption(token, o.id)
                onDeleted()
              }
              const deleteOptionButton = (
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 shrink-0 text-destructive/60 hover:text-destructive"
                  aria-label="Eliminar opción"
                  {...(o.current_count === 0 ? { onClick: handleDeleteOption } : {})}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              )

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
                    <ConfirmDialog
                      trigger={deleteOptionButton}
                      title="¿Eliminar opción?"
                      description={`"${o.label}" tiene ${o.current_count} respuesta${o.current_count === 1 ? '' : 's'} registrada${o.current_count === 1 ? '' : 's'}. Al eliminarla se perderán esos datos. Esta acción no se puede deshacer.`}
                      confirmLabel="Eliminar igualmente"
                      destructive
                      onConfirm={handleDeleteOption}
                    />
                  ) : (
                    deleteOptionButton
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
