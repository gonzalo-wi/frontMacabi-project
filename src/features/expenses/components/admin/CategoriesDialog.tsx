import { useState } from 'react'
import { Loader2, Plus, Tag, Trash2 } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'

import { ActionButton } from '@/components/ActionButton'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { createCategory, deleteCategory } from '@/features/expenses/api/expensesApi'
import { useExpenseCategories } from '@/features/expenses/hooks/useExpenseCategories'
import { queryKeys } from '@/lib/queryKeys'

export function CategoriesDialog({
  open,
  onOpenChange,
  token,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  token: string
}) {
  const qc = useQueryClient()
  const [newCatName, setNewCatName] = useState('')
  const [catError, setCatError] = useState<string | null>(null)

  const categoriesQ = useExpenseCategories(token, open)
  const categories = categoriesQ.data ?? []

  const createCatM = useMutation({
    mutationFn: (name: string) => createCategory(token, name),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.expenses.categoriesRoot() })
      setNewCatName('')
      setCatError(null)
    },
    onError: () => setCatError('No se pudo crear la categoría. Puede que el nombre ya exista.'),
  })

  const deleteCatM = useMutation({
    mutationFn: (id: string) => deleteCategory(token, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.expenses.categoriesRoot() }),
    onError: () => setCatError('No se puede eliminar: hay gastos asociados a esta categoría.'),
  })

  function handleOpenChange(o: boolean) {
    if (createCatM.isPending) return
    if (o) {
      setCatError(null)
      setNewCatName('')
    }
    onOpenChange(o)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-950/40 shrink-0">
              <Tag className="w-4 h-4 text-violet-600 dark:text-violet-400" />
            </div>
            Categorías de gastos
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Nueva categoría…"
              value={newCatName}
              onChange={(e) => { setNewCatName(e.target.value); setCatError(null) }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newCatName.trim()) createCatM.mutate(newCatName.trim())
              }}
              className="h-9 text-sm"
            />
            <ActionButton
              intent="primary"
              onClick={() => { if (newCatName.trim()) createCatM.mutate(newCatName.trim()) }}
              disabled={!newCatName.trim() || createCatM.isPending}
            >
              {createCatM.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            </ActionButton>
          </div>

          {catError && <p className="text-xs text-destructive">{catError}</p>}

          <div className="border rounded-lg divide-y max-h-64 overflow-y-auto">
            {categories.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">
                Todavía no hay categorías.
              </p>
            )}
            {categories.map((cat) => (
              <div key={cat.id} className="flex items-center gap-2 px-3 py-2.5">
                <Tag className="w-3.5 h-3.5 text-violet-500 shrink-0" />
                <span className="flex-1 text-sm">{cat.name}</span>
                <button
                  type="button"
                  onClick={() => { setCatError(null); deleteCatM.mutate(cat.id) }}
                  disabled={deleteCatM.isPending}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                  title="Eliminar categoría"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          <div className="flex justify-end">
            <ActionButton intent="secondary" onClick={() => onOpenChange(false)}>
              Cerrar
            </ActionButton>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
