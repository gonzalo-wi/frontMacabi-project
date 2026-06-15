import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { createProject, deleteProject, listProjects } from '@/features/projects/api/projectsApi'
import type { ProjectDTO } from '@/features/projects/model/types'
import { useAdminUsers } from '@/features/users/hooks/useAdminUsers'
import { useSortableListPage } from '@/hooks/useSortableListPage'
import { PAGE_SIZE } from '@/lib/pagination'
import { queryKeys } from '@/lib/queryKeys'

type ProjectSortKey = 'name' | 'description'

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

  const {
    page,
    setPage,
    search,
    setSearch,
    sortKey,
    sortDir,
    handleSort,
    rowsFrom,
  } = useSortableListPage<ProjectDTO, ProjectSortKey>({
    defaultSortKey: 'name',
    defaultSortDir: 'asc',
    matchSearch: (p, q) =>
      p.name.toLowerCase().includes(q) || (p.description ?? '').toLowerCase().includes(q),
    compare: (a, b, key) => {
      const left = key === 'name' ? a.name : a.description ?? ''
      const right = key === 'name' ? b.name : b.description ?? ''
      return left.localeCompare(right)
    },
  })

  const listQ = useQuery({
    queryKey: queryKeys.projects.adminList(token, page),
    enabled: Boolean(token) && !isRestoring,
    queryFn: () => listProjects(token!, page, PAGE_SIZE),
  })

  const usersQ = useAdminUsers(token, isRestoring)

  const filtered = useMemo(
    () => rowsFrom(listQ.data?.data ?? []),
    [listQ.data, rowsFrom],
  )

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
    ? `Mostrando ${filtered.length} de ${listQ.data.total} proyecto${listQ.data.total === 1 ? '' : 's'}`
    : undefined

  return {
    page,
    setPage,
    search,
    setSearch,
    sortKey,
    sortDir,
    handleSort,
    listQ,
    usersQ,
    filtered,
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
