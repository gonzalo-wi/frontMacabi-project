import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { createResource, deleteResource, updateResource } from '@/features/stock/api/stockApi'
import { useAdminStockResources, useAdminStockRequests } from '@/features/stock/hooks/useAdminStock'
import type { RequestStatus, ResourceDTO } from '@/features/stock/model/types'
import type { FormState } from '@/features/stock/components/admin/ResourceForm'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { queryKeys } from '@/lib/queryKeys'

export type StockSection = 'inventario' | 'pedidos'

const EMPTY_FORM: FormState = { name: '', type: 'returnable', total_stock: '' }

type UseAdminStockPageArgs = {
  token: string | null
  isRestoring: boolean
}

export function useAdminStockPage({ token, isRestoring }: UseAdminStockPageArgs) {
  const qc = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const activeSection: StockSection = searchParams.get('tab') === 'pedidos' ? 'pedidos' : 'inventario'

  const [resourceSearch, setResourceSearch] = useState('')
  const [requestSearch, setRequestSearch] = useState('')
  const [requestStatus, setRequestStatus] = useState<RequestStatus | 'all'>('all')
  const [resourcePage, setResourcePage] = useState(1)
  const [requestPage, setRequestPage] = useState(1)

  const debouncedResourceQ = useDebouncedValue(resourceSearch.trim())
  const debouncedRequestQ = useDebouncedValue(requestSearch.trim())

  const resourceResetKey = debouncedResourceQ
  const [prevResourceResetKey, setPrevResourceResetKey] = useState(resourceResetKey)
  if (resourceResetKey !== prevResourceResetKey) {
    setPrevResourceResetKey(resourceResetKey)
    setResourcePage(1)
  }

  const requestResetKey = [debouncedRequestQ, requestStatus].join('\0')
  const [prevRequestResetKey, setPrevRequestResetKey] = useState(requestResetKey)
  if (requestResetKey !== prevRequestResetKey) {
    setPrevRequestResetKey(requestResetKey)
    setRequestPage(1)
  }

  const [createOpen, setCreateOpen] = useState(false)
  const [createForm, setCreateForm] = useState<FormState>(EMPTY_FORM)
  const [editTarget, setEditTarget] = useState<ResourceDTO | null>(null)
  const [editForm, setEditForm] = useState<FormState>(EMPTY_FORM)

  const resourcesQ = useAdminStockResources(token, resourcePage, debouncedResourceQ, isRestoring)
  const requestsQ = useAdminStockRequests(
    token,
    requestPage,
    debouncedRequestQ,
    requestStatus,
    isRestoring,
  )

  const resourceRows = resourcesQ.data?.data ?? []
  const requestRows = requestsQ.data?.data ?? []
  const resourceTotalPages = resourcesQ.data?.total_pages ?? 1
  const requestTotalPages = requestsQ.data?.total_pages ?? 1

  const pendingCount = requestRows.filter((req) => req.status === 'PENDIENTE').length
  const outOfStock = resourceRows.filter((r) => r.available_stock === 0).length
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
      await qc.invalidateQueries({ queryKey: queryKeys.stock.adminResourcesRoot() })
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
      await qc.invalidateQueries({ queryKey: queryKeys.stock.adminResourcesRoot() })
    },
  })

  const delM = useMutation({
    mutationFn: async (id: string) => deleteResource(token!, id),
    onSuccess: async () => {
      toast.success('Ítem eliminado.')
      await qc.invalidateQueries({ queryKey: queryKeys.stock.adminResourcesRoot() })
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

  function openCreate() {
    setCreateForm(EMPTY_FORM)
    setCreateOpen(true)
  }

  return {
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
  }
}
