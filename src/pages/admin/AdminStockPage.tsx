import { AlertCircle, ArchiveX, Clock, Package, Pencil, Plus } from 'lucide-react'

import { PageHeader } from '@/components/PageHeader'
import { ActionButton } from '@/components/ActionButton'
import { MetricCard } from '@/components/data/MetricCard'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { InventorySection } from '@/features/stock/components/admin/InventorySection'
import { RequestsSection } from '@/features/stock/components/admin/RequestsSection'
import { ResourceForm } from '@/features/stock/components/admin/ResourceForm'
import { useAdminStockPage, type StockSection } from '@/features/stock/hooks/useAdminStockPage'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'

export default function AdminStockPage() {
  const { token, isRestoring } = useAuth()
  const {
    activeSection,
    setSection,
    resourceSearch,
    setResourceSearch,
    requestSearch,
    setRequestSearch,
    requestStatus,
    setRequestStatus,
    resourcePage,
    setResourcePage,
    requestPage,
    setRequestPage,
    createOpen,
    setCreateOpen,
    createForm,
    setCreateForm,
    editTarget,
    setEditTarget,
    editForm,
    setEditForm,
    resourcesQ,
    requestsQ,
    resourceRows,
    requestRows,
    resourceTotalPages,
    requestTotalPages,
    pendingCount,
    outOfStock,
    totalItems,
    createM,
    editM,
    delM,
    openEdit,
    openCreate,
  } = useAdminStockPage({ token, isRestoring })

  return (
    <div className="min-h-screen pb-24">
      <PageHeader
        icon={Package}
        title="Materiales"
        subtitle="Inventario y pedidos de materiales en un solo módulo."
        action={
          activeSection === 'inventario' ? (
            <ActionButton intent="primary" onClick={openCreate}>
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
            rows={resourceRows}
            search={resourceSearch}
            onSearch={setResourceSearch}
            onEdit={openEdit}
            onDelete={(id) => delM.mutate(id)}
            page={resourcePage}
            totalPages={resourceTotalPages}
            onPageChange={setResourcePage}
          />
        ) : (
          <RequestsSection
            requestsQ={requestsQ}
            rows={requestRows}
            search={requestSearch}
            onSearch={setRequestSearch}
            status={requestStatus}
            onStatus={setRequestStatus}
            page={requestPage}
            totalPages={requestTotalPages}
            onPageChange={setRequestPage}
          />
        )}
      </div>

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
            onSubmit={() => { createM.mutate() }}
            isPending={createM.isPending}
            submitLabel="Crear ítem"
            error={createM.error instanceof Error ? createM.error.message : undefined}
          />
        </DialogContent>
      </Dialog>

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
            onSubmit={() => { editM.mutate() }}
            isPending={editM.isPending}
            submitLabel="Guardar cambios"
            error={editM.error instanceof Error ? editM.error.message : undefined}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
