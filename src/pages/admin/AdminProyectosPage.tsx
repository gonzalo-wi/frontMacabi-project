import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { FolderKanban, Loader2, MoreVertical, Plus, Trash2 } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { FeedbackBanner } from '@/components/FeedbackBanner'
import { PageHeader } from '@/components/PageHeader'
import { ActionButton, ActionIconButton } from '@/components/ActionButton'
import { DataToolbar } from '@/components/admin/DataToolbar'
import { MobileList } from '@/components/admin/MobileList'
import { SortableTable, type SortDirection } from '@/components/admin/SortableTable'
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
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { createProject, deleteProject, listProjects } from '@/features/projects/api/projectsApi'
import type { ProjectDTO } from '@/features/projects/model/types'
import { getUsers } from '@/lib/api/admin'
import { ApiError } from '@/lib/api/apiClient'
import type { UserDTO } from '@/lib/api/types'
import { useAuth } from '@/hooks/useAuth'

type ProjectSortKey = 'name' | 'description'

async function fetchAllProjects(token: string): Promise<ProjectDTO[]> {
  const out: ProjectDTO[] = []
  let page = 1
  while (page <= 25) {
    const r = await listProjects(token, page, 50)
    out.push(...r.data)
    if (page >= r.total_pages) break
    page++
  }
  return out
}

function ProjectActions({
  project,
  onDelete,
}: {
  project: ProjectDTO
  onDelete: (projectId: string) => void
}) {
  return (
    <AlertDialog>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <ActionIconButton intent="secondary" label={`Acciones: ${project.name}`}>
            <MoreVertical className="w-4 h-4" />
          </ActionIconButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[11rem]">
          <DropdownMenuItem asChild>
            <Link to={`/app/admin/proyectos/${project.id}/resumen`}>
              Abrir proyecto
            </Link>
          </DropdownMenuItem>
          <AlertDialogTrigger asChild>
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onSelect={(event) => event.preventDefault()}
            >
              <Trash2 className="w-4 h-4" />
              Eliminar
            </DropdownMenuItem>
          </AlertDialogTrigger>
        </DropdownMenuContent>
      </DropdownMenu>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Eliminar proyecto?</AlertDialogTitle>
          <AlertDialogDescription>
            Se perderán vínculos con jornadas y miembros según reglas del servidor.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground"
            onClick={() => onDelete(project.id)}
          >
            Eliminar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export default function AdminProyectosPage() {
  const { token, isRestoring } = useAuth()
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [coordinatorId, setCoordinatorId] = useState('')
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<ProjectSortKey>('name')
  const [sortDir, setSortDir] = useState<SortDirection>('asc')
  const [feedback, setFeedback] = useState<{
    text: string
    variant: 'success' | 'error' | 'info'
  } | null>(null)

  const listQ = useQuery({
    queryKey: ['admin-projects-all', token],
    enabled: Boolean(token) && !isRestoring,
    queryFn: () => fetchAllProjects(token!),
  })

  const usersQ = useQuery({
    queryKey: ['admin-users-all-for-coordinator', token],
    enabled: Boolean(token) && !isRestoring,
    queryFn: async (): Promise<UserDTO[]> => {
      const out: UserDTO[] = []
      let page = 1
      while (page <= 20) {
        const r = await getUsers(token!, page, 50)
        out.push(...r.data)
        if (page >= r.total_pages) break
        page++
      }
      return out
    },
  })

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const rows = listQ.data ?? []
    const filteredRows = q ? rows.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.description ?? '').toLowerCase().includes(q),
    ) : rows

    return [...filteredRows].sort((a, b) => {
      const left = sortKey === 'name' ? a.name : a.description ?? ''
      const right = sortKey === 'name' ? b.name : b.description ?? ''
      const result = left.localeCompare(right)
      return sortDir === 'asc' ? result : -result
    })
  }, [listQ.data, search, sortDir, sortKey])

  function handleSort(key: ProjectSortKey) {
    if (key === sortKey) {
      setSortDir((current) => (current === 'asc' ? 'desc' : 'asc'))
      return
    }
    setSortKey(key)
    setSortDir('asc')
  }

  const createM = useMutation({
    mutationFn: async () => {
      if (!name.trim()) throw new Error('Nombre requerido')
      if (!coordinatorId) throw new Error('Debes asignar un coordinador')
      await createProject(token!, {
        name: name.trim(),
        description: description.trim() || undefined,
        coordinator_id: coordinatorId,
      })
    },
    onSuccess: async () => {
      setFeedback({ text: 'Proyecto creado.', variant: 'success' })
      setOpen(false)
      setName('')
      setDescription('')
      setCoordinatorId('')
      await qc.invalidateQueries({ queryKey: ['admin-projects-all'] })
    },
    onError: (e) =>
      setFeedback({
        text: e instanceof Error ? e.message : 'Error',
        variant: 'error',
      }),
  })

  const delM = useMutation({
    mutationFn: async (pid: string) => deleteProject(token!, pid),
    onSuccess: async () => {
      setFeedback({ text: 'Proyecto eliminado.', variant: 'success' })
      await qc.invalidateQueries({ queryKey: ['admin-projects-all'] })
    },
    onError: (e) =>
      setFeedback({
        text: e instanceof Error ? e.message : 'Error',
        variant: 'error',
      }),
  })

  return (
    <div className="min-h-screen pb-24">
      <PageHeader
        icon={FolderKanban}
        title="Proyectos"
        subtitle="Equipos, miembros y gestión operativa por proyecto."
        action={
          <ActionButton
            intent="primary"
            onClick={() => {
              setFeedback(null)
              setOpen(true)
            }}
          >
            <Plus className="w-4 h-4 mr-1" />
            Nuevo proyecto
          </ActionButton>
        }
      />

      <div className="p-4 lg:p-6 pt-6 lg:pt-8 max-w-5xl mx-auto space-y-4">
        {feedback && <FeedbackBanner message={feedback.text} variant={feedback.variant} />}

        <DataToolbar
          search={search}
          onSearch={setSearch}
          searchPlaceholder="Buscar por nombre o descripción"
          countLabel={
            listQ.data
              ? `Mostrando ${filtered.length} de ${listQ.data.length} proyecto${listQ.data.length === 1 ? '' : 's'}`
              : undefined
          }
        />

        {listQ.isError && (
          <p className="text-sm text-destructive">
            {listQ.error instanceof ApiError ? listQ.error.message : 'Error'}
          </p>
        )}

        <SortableTable
          rows={filtered}
          columns={[
            {
              id: 'name',
              header: 'Proyecto',
              sortKey: 'name',
              render: (project) => (
                <Link
                  className="font-semibold text-primary hover:underline"
                  to={`/app/admin/proyectos/${project.id}/resumen`}
                >
                  {project.name}
                </Link>
              ),
            },
            {
              id: 'description',
              header: 'Descripción',
              sortKey: 'description',
              render: (project) => (
                <span className="line-clamp-2 text-muted-foreground">{project.description ?? '—'}</span>
              ),
            },
            {
              id: 'actions',
              header: 'Acciones',
              headerClassName: 'text-right w-[1%] whitespace-nowrap',
              className: 'text-right',
              render: (project) => <ProjectActions project={project} onDelete={(projectId) => delM.mutate(projectId)} />,
            },
          ]}
          getRowKey={(project) => project.id}
          sortKey={sortKey}
          sortDir={sortDir}
          onSort={handleSort}
          isLoading={listQ.isLoading}
          emptyMessage={search.trim() ? 'No hay proyectos que coincidan con la búsqueda.' : 'Todavía no hay proyectos.'}
        />

        <MobileList
          rows={filtered}
          getRowKey={(project) => project.id}
          isLoading={listQ.isLoading}
          emptyMessage={search.trim() ? 'No hay proyectos que coincidan con la búsqueda.' : 'Todavía no hay proyectos.'}
          renderRow={(project) => (
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 space-y-1">
                <Link
                  className="font-semibold text-primary hover:underline"
                  to={`/app/admin/proyectos/${project.id}/resumen`}
                >
                  {project.name}
                </Link>
                {project.description && (
                  <p className="text-xs text-muted-foreground line-clamp-3">{project.description}</p>
                )}
              </div>
              <ProjectActions project={project} onDelete={(projectId) => delM.mutate(projectId)} />
            </div>
          )}
        />
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo proyecto</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Nombre</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} className="h-11" />
            </div>
            <div className="space-y-1.5">
              <Label>Coordinador</Label>
              <Select value={coordinatorId} onValueChange={setCoordinatorId}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Seleccionar coordinador…" />
                </SelectTrigger>
                <SelectContent>
                  {(usersQ.data ?? []).map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name} <span className="text-muted-foreground text-xs ml-1">({u.email})</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Descripción</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
            </div>
            <Button
              disabled={createM.isPending}
              onClick={() => {
                setFeedback(null)
                createM.mutate()
              }}
              className="w-full"
            >
              {createM.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Crear'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
