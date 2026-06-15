import { FormField } from '@/components/FormField'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import type { ExpenseCategoryDTO } from '@/features/expenses/model/types'
import { formatArsInput } from '@/lib/currency'

type ExpenseFormFieldsProps = {
  idPrefix: string
  amount: string
  onAmountChange: (value: string) => void
  expenseDate: string
  onExpenseDateChange: (value: string) => void
  description: string
  onDescriptionChange: (value: string) => void
  categoryId: string
  onCategoryIdChange: (value: string) => void
  categories: ExpenseCategoryDTO[]
  descriptionPlaceholder?: string
}

export function ExpenseFormFields({
  idPrefix,
  amount,
  onAmountChange,
  expenseDate,
  onExpenseDateChange,
  description,
  onDescriptionChange,
  categoryId,
  onCategoryIdChange,
  categories,
  descriptionPlaceholder,
}: ExpenseFormFieldsProps) {
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <FormField label="Monto" htmlFor={`${idPrefix}-amount`}>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium select-none">
              $
            </span>
            <Input
              id={`${idPrefix}-amount`}
              value={amount}
              onChange={(e) => onAmountChange(formatArsInput(e.target.value))}
              placeholder="1.200,50"
              className="pl-7"
              inputMode="decimal"
            />
          </div>
        </FormField>
        <FormField label="Fecha" htmlFor={`${idPrefix}-date`}>
          <Input
            id={`${idPrefix}-date`}
            type="date"
            value={expenseDate}
            onChange={(e) => onExpenseDateChange(e.target.value)}
          />
        </FormField>
      </div>

      <FormField label="Descripción" htmlFor={`${idPrefix}-description`}>
        <Textarea
          id={`${idPrefix}-description`}
          rows={3}
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          placeholder={descriptionPlaceholder}
          className="resize-none"
        />
      </FormField>

      {categories.length > 0 && (
        <FormField label="Categoría">
          <Select
            value={categoryId || 'none'}
            onValueChange={(v) => onCategoryIdChange(v === 'none' ? '' : v)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Sin categoría" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Sin categoría</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
      )}
    </>
  )
}
