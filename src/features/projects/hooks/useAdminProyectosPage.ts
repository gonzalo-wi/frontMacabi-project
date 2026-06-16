import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { createProject, deleteProject, listProjects } from '@/features/projects/api/projectsApi'
import type { ProjectDTO } from '@/features/projects/model/types'
import { useAdminUsers } from '@/features/users/hooks/useAdminUsers'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { PAGE_SIZE } from '@/lib/pagination'
import { queryKeys } from '@/lib/queryKeys'

type Args = {
  token: string | null
  isRestoring: boolean
}

export function useAdminProyectosPage({ token, isRestoring }: Args) {
  const qc = useQueryClient()
  const [createOpen, setCreateOpen] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [coordinatorId, setCoordinatorId] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<ProjectDTO | null>(null)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const debouncedQ = useDebouncedValue(search.trim())
  const resetKey = debouncedQ
  const [prevResetKey, setPrevResetKey] = useState(resetKey)
  if (resetKey !== prevResetKey) {
    setPrevResetKey(resetKey)
    setPage(1)
  }

  const listQ = useQuery({
    queryKey: queryKeys.projects.adminList(token, page, debouncedQ),
    enabled: Boolean(token) && !isRestoring,
    queryFn: () => listProjects(token!, { page, pageSize: PAGE_SIZE, q: debouncedQ }),
  })

  const usersQ = useAdminUsers(token, isRestoring)

  const rows = listQ.data?.data ?? []
  const totalPages = listQ.data?.total_pages ?? 1

  const createM = useMutation({
    mutationFn: async () => {
      if (!name.trim()) throw new Error('El nombre es requerido')
      if (!coordinatorId) throw new Error('Debés asignar un coordinador')
      await createProject(token!, {
        name: name.trim(),
        description: description.trim() || undefined,
        coordinator_id: coordinatorId,
      })
    },
    onSuccess: async () => {
      toast.success('Proyecto creado.')
      setCreateOpen(false)
      setName('')
      setDescription('')
      setCoordinatorId('')
      await qc.invalidateQueries({ queryKey: queryKeys.projects.adminListRoot() })
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Error al crear el proyecto'),
  })

  const delM = useMutation({
    mutationFn: async (pid: string) => deleteProject(token!, pid),
    onSuccess: async () => {
      toast.success('Proyecto eliminado.')
      await qc.invalidateQueries({ queryKey: queryKeys.projects.adminListRoot() })
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Error al eliminar'),
  })

  const emptyMessage = search.trim()
    ? 'No hay proyectos que coincidan con la búsqueda.'
    : 'Todavía no hay proyectos.'

  const countLabel = listQ.data
    ? `${listQ.data.total} proyecto${listQ.data.total === 1 ? '' : 's'}`
    : undefined

  return {
    page,
    setPage,
    search,
    setSearch,
    listQ,
    usersQ,
    rows,
    totalPages,
    createOpen,
    setCreateOpen,
    name,
    setName,
    description,
    setDescription,
    coordinatorId,
    setCoordinatorId,
    deleteTarget,
    setDeleteTarget,
    createM,
    delM,
    emptyMessage,
    countLabel,
  }
}
