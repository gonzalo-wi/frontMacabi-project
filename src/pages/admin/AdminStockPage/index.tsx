import { useSearchParams } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import { AlertCircle, ArchiveX, Clock, Package, Pencil, Plus } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'

import { toast } from 'sonner'
import { PageHeader } from '@/components/PageHeader'
import { ActionButton } from '@/components/ActionButton'
import { MetricCard } from '@/components/data/MetricCard'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { createResource, deleteResource, updateResource } from '@/features/stock/api/stockApi'
import { useAdminStockResources, useAdminStockRequests } from '@/features/stock/hooks/useAdminStock'
import type { RequestStatus, ResourceDTO } from '@/features/stock/model/types'
import { REQUEST_STATUS_ORDER } from '@/lib/status'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'

import { InventorySection } from './InventorySection'
import { RequestsSection } from './RequestsSection'
import { ResourceForm, type FormState } from './ResourceForm'

type StockSection = 'inventario' | 'pedidos'

const EMPTY_FORM: FormState = { name: '', type: 'returnable', total_stock: '' }

export default function AdminStockPage() {
  const { token, isRestoring } = useAuth()
  const qc = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const activeSection: StockSection = searchParams.get('tab') === 'pedidos' ? 'pedidos' : 'inventario'

  const [resourceSearch, setResourceSearch] = useState('')
  const [requestSearch, setRequestSearch] = useState('')
  const [requestStatus, setRequestStatus] = useState<RequestStatus | 'all'>('all')
  const [resourcePage, setResourcePage] = useState(1)
  const [requestPage, setRequestPage] = useState(1)

  useEffect(() => { setResourcePage(1) }, [resourceSearch])
  useEffect(() => { setRequestPage(1) }, [requestSearch, requestStatus])

  const [createOpen, setCreateOpen] = useState(false)
  const [createForm, setCreateForm] = useState<FormState>(EMPTY_FORM)
  const [editTarget, setEditTarget] = useState<ResourceDTO | null>(null)
  const [editForm, setEditForm] = useState<FormState>(EMPTY_FORM)

  const resourcesQ = useAdminStockResources(token, resourcePage, isRestoring)
  const requestsQ = useAdminStockRequests(token, requestPage, isRestoring)

  const filteredResources = useMemo(() => {
    const q = resourceSearch.trim().toLowerCase()
    const rows = resourcesQ.data?.data ?? []
    if (!q) return rows
    return rows.filter((r) => r.name.toLowerCase().includes(q))
  }, [resourcesQ.data, resourceSearch])

  const sortedRequests = useMemo(() => {
    const order = REQUEST_STATUS_ORDER
    return [...(requestsQ.data?.data ?? [])].sort((a, b) => {
      const byStatus = order[a.status] - order[b.status]
      if (byStatus !== 0) return byStatus
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })
  }, [requestsQ.data])

  const filteredRequests = useMemo(() => {
    const term = requestSearch.trim().toLowerCase()
    return sortedRequests.filter((req) => {
      if (requestStatus !== 'all' && req.status !== requestStatus) return false
      if (!term) return true
      return (
        req.resource_name.toLowerCase().includes(term) ||
        req.project_name.toLowerCase().includes(term) ||
        req.requester_name.toLowerCase().includes(term)
      )
    })
  }, [requestSearch, requestStatus, sortedRequests])

  const pendingCount = (requestsQ.data?.data ?? []).filter((req) => req.status === 'PENDIENTE').length
  const outOfStock = (resourcesQ.data?.data ?? []).filter((r) => r.available_stock === 0).length
  const totalItems = resourcesQ.data?.total ?? 0

  const createM = useMutation({
    mutationFn: async () => {
      const stock = Number(createForm.total_stock)
      if (!createForm.name.trim()) throw new Error('El nombre es requerido')
      if (isNaN(stock) || stock <= 0) throw new Error('El stock debe ser un número mayor a 0')
      await createResource(token!, {
        name: createForm.name.trim(),
        type: createForm.type,
        total_stock: stock,
      })
    },
    onSuccess: async () => {
      toast.success('Ítem creado.')
      setCreateOpen(false)
      setCreateForm(EMPTY_FORM)
      await qc.invalidateQueries({ queryKey: ['admin-stock-resources'] })
    },
  })

  const editM = useMutation({
    mutationFn: async () => {
      if (!editTarget) return
      const stock = Number(editForm.total_stock)
      if (!editForm.name.trim()) throw new Error('El nombre es requerido')
      if (isNaN(stock) || stock <= 0) throw new Error('El stock debe ser un número mayor a 0')
      await updateResource(token!, editTarget.id, {
        name: editForm.name.trim(),
        type: editForm.type,
        total_stock: stock,
      })
    },
    onSuccess: async () => {
      toast.success('Ítem actualizado.')
      setEditTarget(null)
      await qc.invalidateQueries({ queryKey: ['admin-stock-resources'] })
    },
  })

  const delM = useMutation({
    mutationFn: async (id: string) => deleteResource(token!, id),
    onSuccess: async () => {
      toast.success('Ítem eliminado.')
      await qc.invalidateQueries({ queryKey: ['admin-stock-resources'] })
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Error al eliminar'),
  })

  function setSection(next: StockSection) {
    setSearchParams(next === 'pedidos' ? { tab: 'pedidos' } : {})
  }

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
        title="Materiales"
        subtitle="Inventario y pedidos de materiales en un solo módulo."
        action={
          activeSection === 'inventario' ? (
            <ActionButton
              intent="primary"
              onClick={() => {
                setCreateForm(EMPTY_FORM)
                setCreateOpen(true)
              }}
            >
              <Plus className="w-4 h-4 mr-1" />
              Nuevo ítem
            </ActionButton>
          ) : pendingCount > 0 ? (
            <div className="flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700">
              <AlertCircle className="w-3.5 h-3.5" />
              {pendingCount} pendiente{pendingCount !== 1 ? 's' : ''}
            </div>
          ) : null
        }
      />

      <div className="p-4 lg:p-6 max-w-6xl mx-auto space-y-5">

        {/* ── Metrics ── */}
        <div className="grid gap-3 sm:grid-cols-3">
          <MetricCard
            title="Ítems en inventario"
            value={String(totalItems)}
            icon={<Package className="h-4 w-4 text-primary" />}
          />
          <MetricCard
            title="Sin disponibilidad"
            value={String(outOfStock)}
            tone={outOfStock > 0 ? 'red' : 'default'}
            icon={<ArchiveX className={cn('h-4 w-4', outOfStock > 0 ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground')} />}
          />
          <MetricCard
            title="Pedidos pendientes"
            value={String(pendingCount)}
            tone={pendingCount > 0 ? 'warn' : 'default'}
            icon={<Clock className={cn('h-4 w-4', pendingCount > 0 ? 'text-amber-700 dark:text-amber-400' : 'text-muted-foreground')} />}
          />
        </div>

        {/* ── Tabs ── */}
        <div className="overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden -mx-1 px-1">
          <div className="flex min-w-max border-b border-border">
            {(['inventario', 'pedidos'] as StockSection[]).map((section) => (
              <button
                key={section}
                type="button"
                onClick={() => setSection(section)}
                className={cn(
                  'flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors',
                  activeSection === section
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground',
                )}
              >
                {section === 'inventario' ? 'Inventario' : 'Pedidos'}
                {section === 'pedidos' && pendingCount > 0 && (
                  <span className="inline-flex items-center justify-center h-5 min-w-[1.25rem] rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold px-1">
                    {pendingCount}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {activeSection === 'inventario' ? (
          <InventorySection
            resourcesQ={resourcesQ}
            filteredResources={filteredResources}
            search={resourceSearch}
            onSearch={setResourceSearch}
            onEdit={openEdit}
            onDelete={(id) => delM.mutate(id)}
            page={resourcePage}
            totalPages={resourcesQ.data?.total_pages ?? 1}
            onPageChange={setResourcePage}
          />
        ) : (
          <RequestsSection
            requestsQ={requestsQ}
            filteredRequests={filteredRequests}
            search={requestSearch}
            onSearch={setRequestSearch}
            status={requestStatus}
            onStatus={setRequestStatus}
            page={requestPage}
            totalPages={requestsQ.data?.total_pages ?? 1}
            onPageChange={setRequestPage}
          />
        )}
      </div>

      {/* ── Create dialog ── */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                <Package className="w-4 h-4 text-primary" />
              </div>
              Nuevo ítem de inventario
            </DialogTitle>
          </DialogHeader>
          <ResourceForm
            form={createForm}
            onChange={setCreateForm}
            onSubmit={() => {
              createM.mutate()
            }}
            isPending={createM.isPending}
            submitLabel="Crear ítem"
            error={createM.error instanceof Error ? createM.error.message : undefined}
          />
        </DialogContent>
      </Dialog>

      {/* ── Edit dialog ── */}
      <Dialog
        open={Boolean(editTarget)}
        onOpenChange={(v: boolean) => { if (!v) setEditTarget(null) }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                <Pencil className="w-4 h-4 text-primary" />
              </div>
              Editar ítem de inventario
            </DialogTitle>
          </DialogHeader>
          <ResourceForm
            form={editForm}
            onChange={setEditForm}
            onSubmit={() => {
              editM.mutate()
            }}
            isPending={editM.isPending}
            submitLabel="Guardar cambios"
            error={editM.error instanceof Error ? editM.error.message : undefined}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
