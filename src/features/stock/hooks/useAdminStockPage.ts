import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { createResource, deleteResource, updateResource } from '@/features/stock/api/stockApi'
import { useAdminStockResources, useAdminStockRequests } from '@/features/stock/hooks/useAdminStock'
import type { RequestStatus, ResourceDTO } from '@/features/stock/model/types'
import { REQUEST_STATUS_ORDER } from '@/features/stock/lib/status'
import type { FormState } from '@/features/stock/components/admin/ResourceForm'
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
    filteredResources,
    filteredRequests,
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
