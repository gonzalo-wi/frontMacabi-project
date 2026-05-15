import { useMemo, useState } from 'react'
import { Loader2, Package, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { FeedbackBanner } from '@/components/FeedbackBanner'
import { PageHeader } from '@/components/PageHeader'
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
  createResource,
  deleteResource,
  listResources,
  updateResource,
} from '@/features/stock/api/stockApi'
import type { ResourceDTO, ResourceType } from '@/features/stock/model/types'
import { ApiError } from '@/lib/api/apiClient'
import { useAuth } from '@/hooks/useAuth'

async function fetchAllResources(token: string): Promise<ResourceDTO[]> {
  const out: ResourceDTO[] = []
  let page = 1
  while (page <= 50) {
    const r = await listResources(token, page, 50)
    out.push(...r.data)
    if (page >= r.total_pages) break
    page++
  }
  return out
}

const RESOURCE_TYPE_LABELS: Record<ResourceType, string> = {
  returnable: 'Retornable',
  consumable: 'Consumible',
}

type FormState = {
  name: string
  type: ResourceType
  total_stock: string
}

const EMPTY_FORM: FormState = { name: '', type: 'returnable', total_stock: '' }

export default function AdminStockPage() {
  const { token, isRestoring } = useAuth()
  const qc = useQueryClient()

  const [search, setSearch] = useState('')
  const [feedback, setFeedback] = useState<{
    text: string
    variant: 'success' | 'error' | 'info'
  } | null>(null)

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false)
  const [createForm, setCreateForm] = useState<FormState>(EMPTY_FORM)

  // Edit dialog
  const [editTarget, setEditTarget] = useState<ResourceDTO | null>(null)
  const [editForm, setEditForm] = useState<FormState>(EMPTY_FORM)

  const listQ = useQuery({
    queryKey: ['admin-stock-resources', token],
    enabled: Boolean(token) && !isRestoring,
    queryFn: () => fetchAllResources(token!),
  })

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const rows = listQ.data ?? []
    if (!q) return rows
    return rows.filter((r) => r.name.toLowerCase().includes(q))
  }, [listQ.data, search])

  // ── Create ──────────────────────────────────────────────
  const createM = useMutation({
    mutationFn: async () => {
      const stock = Number(createForm.total_stock)
      if (!createForm.name.trim()) throw new Error('El nombre es requerido')
      if (isNaN(stock) || stock < 0) throw new Error('El stock debe ser un número mayor o igual a 0')
      await createResource(token!, {
        name: createForm.name.trim(),
        type: createForm.type,
        total_stock: stock,
      })
    },
    onSuccess: async () => {
      setFeedback({ text: 'Recurso creado.', variant: 'success' })
      setCreateOpen(false)
      setCreateForm(EMPTY_FORM)
      await qc.invalidateQueries({ queryKey: ['admin-stock-resources'] })
    },
    onError: (e) =>
      setFeedback({ text: e instanceof Error ? e.message : 'Error al crear', variant: 'error' }),
  })

  // ── Edit ─────────────────────────────────────────────────
  const editM = useMutation({
    mutationFn: async () => {
      if (!editTarget) return
      const stock = Number(editForm.total_stock)
      if (!editForm.name.trim()) throw new Error('El nombre es requerido')
      if (isNaN(stock) || stock < 0) throw new Error('El stock debe ser un número mayor o igual a 0')
      await updateResource(token!, editTarget.id, {
        name: editForm.name.trim(),
        type: editForm.type,
        total_stock: stock,
      })
    },
    onSuccess: async () => {
      setFeedback({ text: 'Recurso actualizado.', variant: 'success' })
      setEditTarget(null)
      await qc.invalidateQueries({ queryKey: ['admin-stock-resources'] })
    },
    onError: (e) =>
      setFeedback({ text: e instanceof Error ? e.message : 'Error al actualizar', variant: 'error' }),
  })

  // ── Delete ───────────────────────────────────────────────
  const delM = useMutation({
    mutationFn: async (id: string) => deleteResource(token!, id),
    onSuccess: async () => {
      setFeedback({ text: 'Recurso eliminado.', variant: 'success' })
      await qc.invalidateQueries({ queryKey: ['admin-stock-resources'] })
    },
    onError: (e) =>
      setFeedback({
        text: e instanceof Error ? e.message : 'Error al eliminar',
        variant: 'error',
      }),
  })

  function openEdit(resource: ResourceDTO) {
    setEditForm({
      name: resource.name,
      type: resource.type,
      total_stock: String(resource.total_stock),
    })
    setEditTarget(resource)
  }

  return (
    <div className="min-h-screen pb-24">
      <PageHeader
        icon={Package}
        title="Stock"
        subtitle="Administración"
        action={
          <Button
            size="sm"
            onClick={() => {
              setFeedback(null)
              setCreateForm(EMPTY_FORM)
              setCreateOpen(true)
            }}
          >
            <Plus className="w-4 h-4 mr-1" />
            Nuevo
          </Button>
        }
      />

      <div className="p-4 lg:p-6 max-w-5xl mx-auto space-y-4">
        {feedback && <FeedbackBanner message={feedback.text} variant={feedback.variant} />}

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Buscar por nombre…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-11 pl-9"
            aria-label="Buscar recursos"
          />
        </div>

        {listQ.isError && (
          <p className="text-sm text-destructive">
            {listQ.error instanceof ApiError ? listQ.error.message : 'Error al cargar los recursos'}
          </p>
        )}

        {listQ.isLoading && <div className="h-24 bg-muted/50 rounded-lg animate-pulse" />}

        {!listQ.isLoading && listQ.data && (
          <p className="text-xs text-muted-foreground">
            Mostrando {filtered.length} de {listQ.data.length} recurso{listQ.data.length === 1 ? '' : 's'}
          </p>
        )}

        {/* Desktop: tabla */}
        {!listQ.isLoading && listQ.data && filtered.length > 0 && (
          <div className="hidden md:block rounded-xl border border-border bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="font-medium px-4 py-3">Nombre</th>
                  <th className="font-medium px-4 py-3">Tipo</th>
                  <th className="font-medium px-4 py-3 text-right">Stock total</th>
                  <th className="font-medium px-4 py-3 text-right">Disponible</th>
                  <th className="font-medium px-4 py-3 text-right w-[1%] whitespace-nowrap">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr
                    key={r.id}
                    className="border-b border-border/80 last:border-0 hover:bg-muted/25 transition-colors"
                  >
                    <td className="px-4 py-3 font-medium">{r.name}</td>
                    <td className="px-4 py-3">
                      <Badge variant={r.type === 'returnable' ? 'secondary' : 'outline'}>
                        {RESOURCE_TYPE_LABELS[r.type]}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{r.total_stock}</td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      <span
                        className={
                          r.available_stock === 0
                            ? 'text-destructive font-medium'
                            : 'text-emerald-600 dark:text-emerald-400 font-medium'
                        }
                      >
                        {r.available_stock}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          aria-label={`Editar ${r.name}`}
                          onClick={() => openEdit(r)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 shrink-0 text-destructive hover:text-destructive"
                              aria-label={`Eliminar ${r.name}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>¿Eliminar recurso?</AlertDialogTitle>
                              <AlertDialogDescription>
                                No se puede deshacer. Si el recurso tiene pedidos activos, la operación será rechazada por el servidor.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                className="bg-destructive text-destructive-foreground"
                                onClick={() => delM.mutate(r.id)}
                              >
                                Eliminar
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Mobile: tarjetas */}
        {!listQ.isLoading && listQ.data && filtered.length > 0 && (
          <div className="md:hidden space-y-3">
            {filtered.map((r) => (
              <Card key={r.id}>
                <CardContent className="py-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-base">{r.name}</p>
                      <Badge
                        variant={r.type === 'returnable' ? 'secondary' : 'outline'}
                        className="mt-1"
                      >
                        {RESOURCE_TYPE_LABELS[r.type]}
                      </Badge>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs text-muted-foreground">Total / Disponible</p>
                      <p className="text-sm font-semibold tabular-nums">
                        {r.total_stock} /{' '}
                        <span
                          className={
                            r.available_stock === 0
                              ? 'text-destructive'
                              : 'text-emerald-600 dark:text-emerald-400'
                          }
                        >
                          {r.available_stock}
                        </span>
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      className="gap-1"
                      onClick={() => openEdit(r)}
                    >
                      <Pencil className="w-4 h-4" />
                      Editar
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-destructive border-destructive/30"
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          Eliminar
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>¿Eliminar recurso?</AlertDialogTitle>
                          <AlertDialogDescription>
                            No se puede deshacer. Si el recurso tiene pedidos activos, la operación será rechazada por el servidor.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-destructive text-destructive-foreground"
                            onClick={() => delM.mutate(r.id)}
                          >
                            Eliminar
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {!listQ.isLoading && listQ.data && filtered.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">
            {search.trim()
              ? 'No hay recursos que coincidan con la búsqueda.'
              : 'Todavía no hay recursos de stock.'}
          </p>
        )}
      </div>

      {/* ── Dialog: Crear recurso ───────────────────────────── */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo recurso</DialogTitle>
          </DialogHeader>
          <ResourceForm
            form={createForm}
            onChange={setCreateForm}
            onSubmit={() => {
              setFeedback(null)
              createM.mutate()
            }}
            isPending={createM.isPending}
            submitLabel="Crear"
          />
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Editar recurso ──────────────────────────── */}
      <Dialog open={Boolean(editTarget)} onOpenChange={(v) => { if (!v) setEditTarget(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar recurso</DialogTitle>
          </DialogHeader>
          <ResourceForm
            form={editForm}
            onChange={setEditForm}
            onSubmit={() => {
              setFeedback(null)
              editM.mutate()
            }}
            isPending={editM.isPending}
            submitLabel="Guardar cambios"
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ── Shared form component ────────────────────────────────────

type ResourceFormProps = {
  form: FormState
  onChange: (f: FormState) => void
  onSubmit: () => void
  isPending: boolean
  submitLabel: string
}

function ResourceForm({ form, onChange, onSubmit, isPending, submitLabel }: ResourceFormProps) {
  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    onChange({ ...form, [key]: value })
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="resource-name">Nombre</Label>
        <Input
          id="resource-name"
          value={form.name}
          onChange={(e) => set('name', e.target.value)}
          className="h-11"
          placeholder="Ej: Proyector Epson"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="resource-type">Tipo</Label>
        <Select value={form.type} onValueChange={(v) => set('type', v as ResourceType)}>
          <SelectTrigger id="resource-type" className="h-11">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="returnable">Retornable</SelectItem>
            <SelectItem value="consumable">Consumible</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="resource-stock">Stock total</Label>
        <Input
          id="resource-stock"
          type="number"
          min={0}
          value={form.total_stock}
          onChange={(e) => set('total_stock', e.target.value)}
          className="h-11"
          placeholder="0"
        />
      </div>
      <Button disabled={isPending} onClick={onSubmit} className="w-full">
        {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : submitLabel}
      </Button>
    </div>
  )
}
