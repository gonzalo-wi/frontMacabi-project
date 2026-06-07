import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { FolderKanban, Loader2, MoreVertical, Plus, Trash2 } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { FeedbackBanner } from '@/components/FeedbackBanner'
import { useFeedback } from '@/hooks/useFeedback'
import { PageHeader } from '@/components/PageHeader'
import { ActionButton, ActionIconButton } from '@/components/ActionButton'
import { DataToolbar } from '@/components/admin/DataToolbar'
import { MobileList } from '@/components/admin/MobileList'
import { PaginationControls } from '@/components/admin/PaginationControls'
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
import { cn } from '@/lib/utils'

type ProjectSortKey = 'name' | 'description'

const PAGE_SIZE = 10

// ── Helpers ──────────────────────────────────────────────────────────────────

function projectInitial(name: string): string {
  return name.trim()[0]?.toUpperCase() ?? 'P'
}

function projectAvatarColor(name: string): string {
  const colors = [
    'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300',
    'bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300',
    'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300',
    'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300',
    'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300',
    'bg-cyan-100 text-cyan-700 dark:bg-cyan-950/60 dark:text-cyan-300',
  ]
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return colors[Math.abs(hash) % colors.length]
}

// ── ProjectActions ────────────────────────────────────────────────────────────

function ProjectActions({
  project,
  onDelete,
}: {
  project: ProjectDTO
  onDelete: (projectId: string) => void
}) {
  return (
    <div className="flex items-center gap-1 shrink-0">
      {/* Botón abrir directo — visible en desktop */}
      <ActionButton intent="view" asChild size="sm" className="hidden sm:inline-flex">
        <Link to={`/app/admin/proyectos/${project.id}/resumen`}>Abrir</Link>
      </ActionButton>

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
                className="text-destructive focus:text-destructive gap-2"
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
            <AlertDialogTitle>¿Eliminar "{project.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Se perderán los vínculos con jornadas y miembros según las reglas del servidor. Esta
              acción no se puede deshacer.
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
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function AdminProyectosPage() {
  const { token, isRestoring } = useAuth()
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [page, setPage] = useState(1)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [coordinatorId, setCoordinatorId] = useState('')
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<ProjectSortKey>('name')
  const [sortDir, setSortDir] = useState<SortDirection>('asc')
  const { feedback, setFeedback } = useFeedback()

  useEffect(() => {
    setPage(1)
  }, [search, sortKey, sortDir])

  const listQ = useQuery({
    queryKey: ['admin-projects-all', token, page],
    enabled: Boolean(token) && !isRestoring,
    queryFn: () => listProjects(token!, page, PAGE_SIZE),
  })

  const usersQ = useQuery({
    queryKey: ['admin-users-all-for-coordinator', token],
    enabled: Boolean(token) && !isRestoring,
    queryFn: async (): Promise<UserDTO[]> => {
      const out: UserDTO[] = []
      let p = 1
      while (p <= 20) {
        const r = await getUsers(token!, p, 50)
        out.push(...r.data)
        if (p >= r.total_pages) break
        p++
      }
      return out
    },
  })

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const rows = listQ.data?.data ?? []
    const filteredRows = q
      ? rows.filter(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            (p.description ?? '').toLowerCase().includes(q),
        )
      : rows
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
      if (!name.trim()) throw new Error('El nombre es requerido')
      if (!coordinatorId) throw new Error('Debés asignar un coordinador')
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
        text: e instanceof Error ? e.message : 'Error al crear el proyecto',
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
        text: e instanceof Error ? e.message : 'Error al eliminar',
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
            <Plus className="w-4 h-4" />
            <span className="hidden xs:inline ml-1">Nuevo proyecto</span>
            <span className="xs:hidden ml-1">Nuevo</span>
          </ActionButton>
        }
      />

      <div className="px-3 py-4 sm:px-4 lg:px-6 lg:py-6 max-w-5xl mx-auto space-y-4">
        {feedback && <FeedbackBanner message={feedback.text} variant={feedback.variant} />}

        <DataToolbar
          search={search}
          onSearch={setSearch}
          searchPlaceholder="Buscar por nombre o descripción…"
          countLabel={
            listQ.data
              ? `Mostrando ${filtered.length} de ${listQ.data.total} proyecto${listQ.data.total === 1 ? '' : 's'}`
              : undefined
          }
        />

        {listQ.isError && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {listQ.error instanceof ApiError ? listQ.error.message : 'Error al cargar proyectos'}
          </div>
        )}

        {/* Desktop table */}
        <SortableTable
          rows={filtered}
          columns={[
            {
              id: 'name',
              header: 'Proyecto',
              sortKey: 'name',
              render: (project) => (
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      'h-8 w-8 shrink-0 rounded-lg flex items-center justify-center text-sm font-bold select-none',
                      projectAvatarColor(project.name),
                    )}
                  >
                    {projectInitial(project.name)}
                  </div>
                  <Link
                    className="font-semibold text-primary hover:underline"
                    to={`/app/admin/proyectos/${project.id}/resumen`}
                  >
                    {project.name}
                  </Link>
                </div>
              ),
            },
            {
              id: 'description',
              header: 'Descripción',
              sortKey: 'description',
              render: (project) => (
                <span className="line-clamp-2 text-muted-foreground text-sm">
                  {project.description ?? '—'}
                </span>
              ),
            },
            {
              id: 'actions',
              header: 'Acciones',
              headerClassName: 'text-right w-[1%] whitespace-nowrap',
              className: 'text-right',
              render: (project) => (
                <ProjectActions
                  project={project}
                  onDelete={(projectId) => delM.mutate(projectId)}
                />
              ),
            },
          ]}
          getRowKey={(project) => project.id}
          sortKey={sortKey}
          sortDir={sortDir}
          onSort={handleSort}
          isLoading={listQ.isLoading}
          emptyMessage={
            search.trim()
              ? 'No hay proyectos que coincidan con la búsqueda.'
              : 'Todavía no hay proyectos.'
          }
        />

        {/* Mobile list */}
        <MobileList
          rows={filtered}
          getRowKey={(project) => project.id}
          isLoading={listQ.isLoading}
          emptyMessage={
            search.trim()
              ? 'No hay proyectos que coincidan con la búsqueda.'
              : 'Todavía no hay proyectos.'
          }
          renderRow={(project) => (
            <div className="flex items-start gap-3">
              {/* Avatar con inicial */}
              <div
                className={cn(
                  'h-9 w-9 shrink-0 rounded-xl flex items-center justify-center text-sm font-bold select-none mt-0.5',
                  projectAvatarColor(project.name),
                )}
              >
                {projectInitial(project.name)}
              </div>

              <div className="min-w-0 flex-1 space-y-0.5">
                <Link
                  className="font-semibold text-primary hover:underline leading-tight block"
                  to={`/app/admin/proyectos/${project.id}/resumen`}
                >
                  {project.name}
                </Link>
                {project.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {project.description}
                  </p>
                )}
              </div>

              <ProjectActions
                project={project}
                onDelete={(projectId) => delM.mutate(projectId)}
              />
            </div>
          )}
        />

        <PaginationControls
          page={page}
          totalPages={listQ.data?.total_pages ?? 1}
          onPageChange={setPage}
        />
      </div>

      {/* ── Dialog: Nuevo proyecto ── */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderKanban className="w-4 h-4 text-primary" />
              Nuevo proyecto
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <Label htmlFor="proj-name" className="text-xs font-semibold">
                Nombre del proyecto
              </Label>
              <Input
                id="proj-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej: Kiná 2025"
                className="h-10"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="proj-coord" className="text-xs font-semibold">
                Coordinador
              </Label>
              <Select value={coordinatorId} onValueChange={setCoordinatorId}>
                <SelectTrigger id="proj-coord" className="h-10">
                  <SelectValue placeholder="Seleccioná un coordinador…" />
                </SelectTrigger>
                <SelectContent>
                  {(usersQ.data ?? []).map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      <span className="font-medium">{u.name}</span>
                      <span className="text-muted-foreground text-xs ml-1.5">{u.email}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {usersQ.isLoading && (
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Loader2 className="w-3 h-3 animate-spin" /> Cargando usuarios…
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="proj-desc" className="text-xs font-semibold">
                Descripción{' '}
                <span className="font-normal text-muted-foreground">(opcional)</span>
              </Label>
              <Textarea
                id="proj-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                placeholder="Breve descripción del proyecto…"
                className="resize-none"
              />
            </div>

            <Button
              disabled={createM.isPending}
              onClick={() => {
                setFeedback(null)
                createM.mutate()
              }}
              className="w-full"
            >
              {createM.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creando…
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-1.5" />
                  Crear proyecto
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
