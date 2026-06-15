import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export type SelectFilterOption = { value: string; label: string }

type SelectFilterProps = {
  value: string
  onValueChange: (value: string) => void
  options: SelectFilterOption[]
  placeholder?: string
  /** Clases del trigger (preserva el estilo propio de cada página). */
  triggerClassName?: string
}

/**
 * Select de filtro reutilizable (proyecto / estado).
 * Mantiene el `triggerClassName` por sitio para no cambiar estilos.
 */
export function SelectFilter({
  value,
  onValueChange,
  options,
  placeholder,
  triggerClassName,
}: SelectFilterProps) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className={triggerClassName}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
