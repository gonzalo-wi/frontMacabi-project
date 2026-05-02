import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Loader2,
  FolderOpen,
  Plus,
  Pencil,
  Trash2,
  UtensilsCrossed,
  ChevronRight,
  X,
  User,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { listProjects, createProject, updateProject, deleteProject } from '@/lib/api/projects'
import { getUsers } from '@/lib/api/admin'
import type { ProjectDTO, CreateProjectBody } from '@/lib/api/types'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { PageHeader } from '@/components/PageHeader'

// ─── Tipos y constantes ─────────────────────────────────────

type ProjectForm = { name: string; description: string; admin_user_id: string }
const EMPTY_FORM: ProjectForm = { name: '', description: '', admin_user_id: '' }

const inputClass =
  'px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none bg-white focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition-all w-full'

const PROJECT_COLORS = [
  { bg: 'from-blue-500 to-indigo-600',   avatar: 'bg-blue-100 text-blue-700',   bar: 'bg-gradient-to-r from-blue-500 to-indigo-600'   },
  { bg: 'from-emerald-500 to-teal-600',  avatar: 'bg-emerald-100 text-emerald-700', bar: 'bg-gradient-to-r from-emerald-500 to-teal-600'  },
  { bg: 'from-violet-500 to-purple-600', avatar: 'bg-violet-100 text-violet-700',  bar: 'bg-gradient-to-r from-violet-500 to-purple-600' },
  { bg: 'from-amber-500 to-orange-500',  avatar: 'bg-amber-100 text-amber-700',   bar: 'bg-gradient-to-r from-amber-500 to-orange-500'  },
  { bg: 'from-rose-500 to-pink-600',     avatar: 'bg-rose-100 text-rose-700',     bar: 'bg-gradient-to-r from-rose-500 to-pink-600'     },
  { bg: 'from-cyan-500 to-sky-600',      avatar: 'bg-cyan-100 text-cyan-700',     bar: 'bg-gradient-to-r from-cyan-500 to-sky-600'      },
]

function getInitials(name: string) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

function formatDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })
}

// ─── Sub-componentes (fuera del padre para evitar remount) ───

function UserSelect({
  value,
  onChange,
  users,
}: {
  value: string
  onChange: (id: string) => void
  users: { id: string; name: string; email: string }[]
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold text-gray-600">
        Admin del proyecto<span className="text-red-400 ml-0.5">*</span>
      </label>
      <select
        className={inputClass}
        value={value}
        onChange={e => onChange(e.target.value)}
      >
        <option value="">Seleccionar usuario...</option>
        {users.map(u => (
          <option key={u.id} value={u.id}>
            {u.name} — {u.email}
          </option>
        ))}
      </select>
    </div>
  )
}

function ProjectFormFields({
  form,
  onChange,
  users,
}: {
  form: ProjectForm
  onChange: (f: ProjectForm) => void
  users: { id: string; name: string; email: string }[]
}) {
  return (
    <div className="flex flex-col gap-4 mt-2">
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-gray-600">
          Nombre<span className="text-red-400 ml-0.5">*</span>
        </label>
        <input
          className={inputClass}
          placeholder="Ej: Matok"
          value={form.name}
          onChange={e => onChange({ ...form, name: e.target.value })}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-gray-600">Descripción</label>
        <input
          className={inputClass}
          placeholder="Ej: Proyecto para niños"
          value={form.description}
          onChange={e => onChange({ ...form, description: e.target.value })}
        />
      </div>
      <UserSelect
        value={form.admin_user_id}
        onChange={id => onChange({ ...form, admin_user_id: id })}
        users={users}
      />
    </div>
  )
}

// ─── Skeleton ────────────────────────────────────────────────

function ProjectCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden animate-pulse">
      <div className="h-1.5 w-full bg-gray-200" />
      <div className="p-5 space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gray-200 flex-shrink-0" />
          <div className="flex-1 space-y-2 pt-0.5">
            <div className="h-4 bg-gray-200 rounded w-2/3" />
            <div className="h-3 bg-gray-200 rounded w-1/2" />
          </div>
        </div>
        <div className="h-9 bg-gray-200 rounded-xl" />
      </div>
    </div>
  )
}

// ─── Página ──────────────────────────────────────────────────

export default function AdminProyectosPage() {
  const { token, user } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [showCreate, setShowCreate] = useState(false)
  const [createForm, setCreateForm] = useState<ProjectForm>(EMPTY_FORM)

  const [editingProject, setEditingProject] = useState<ProjectDTO | null>(null)
  const [editForm, setEditForm] = useState<ProjectForm>(EMPTY_FORM)

  const [deletingId, setDeletingId] = useState<string | null>(null)

  // ─── Queries ────────────────────────────────────────────────

  const projectsQuery = useQuery({
    queryKey: ['admin-projects'],
    queryFn: () => listProjects(token!, 1, 100),
    enabled: !!token,
  })

  const usersQuery = useQuery({
    queryKey: ['admin-users-all'],
    queryFn: () => getUsers(token!, 1, 200),
    enabled: !!token,
  })

  // ─── Mutations ──────────────────────────────────────────────

  const createMutation = useMutation({
    mutationFn: (body: CreateProjectBody) => createProject(token!, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-projects'] })
      setShowCreate(false)
      setCreateForm(EMPTY_FORM)
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: ProjectForm }) =>
      updateProject(token!, id, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-projects'] })
      setEditingProject(null)
      setEditForm(EMPTY_FORM)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteProject(token!, id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-projects'] })
      setDeletingId(null)
    },
  })

  // ─── Helpers ────────────────────────────────────────────────

  const isSuperAdmin = user?.role === 'super_admin'
  const projects = projectsQuery.data?.data ?? []
  const users = usersQuery.data?.data ?? []

  function startEdit(p: ProjectDTO) {
    setEditingProject(p)
    setEditForm({ name: p.name, description: p.description, admin_user_id: p.admin_user_id })
  }

  function handleCreate() {
    createMutation.mutate(createForm)
  }

  function handleUpdate() {
    if (!editingProject) return
    updateMutation.mutate({ id: editingProject.id, body: editForm })
  }

  const headerAction = isSuperAdmin ? (
    <button
      onClick={() => setShowCreate(true)}
      className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-[#0D1B2A] text-white hover:bg-[#1a3a5c] transition-all"
    >
      <Plus className="h-4 w-4" />
      <span className="hidden sm:inline">Nuevo proyecto</span>
      <span className="sm:hidden">Nuevo</span>
    </button>
  ) : undefined

  return (
    <div className="min-h-screen bg-gray-50">
      <PageHeader
        icon={FolderOpen}
        title="Proyectos"
        subtitle="Administrá los proyectos y sus comidas"
        action={headerAction}
      />

      {/* Contenido */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">

        {/* Loading */}
        {projectsQuery.isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[0, 1, 2].map(i => <ProjectCardSkeleton key={i} />)}
          </div>
        )}

        {/* Empty */}
        {!projectsQuery.isLoading && projects.length === 0 && (
          <div className="bg-white border-2 border-dashed border-gray-200 rounded-2xl p-16 text-center">
            <FolderOpen className="h-10 w-10 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No hay proyectos creados</p>
            {isSuperAdmin && (
              <p className="text-gray-400 text-sm mt-1">Usá el botón "Nuevo proyecto" para crear el primero</p>
            )}
          </div>
        )}

        {/* Grid de proyectos */}
        {!projectsQuery.isLoading && projects.length > 0 && (
          <>
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-4">
              {projects.length} {projects.length === 1 ? 'proyecto' : 'proyectos'}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {projects.map((p, i) => {
                const color = PROJECT_COLORS[i % PROJECT_COLORS.length]
                const adminUser = users.find(u => u.id === p.admin_user_id)
                return (
                  <div
                    key={p.id}
                    className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md hover:border-gray-200 transition-all flex flex-col"
                  >
                    {/* Barra de color superior */}
                    <div className={`h-1.5 w-full ${color.bar}`} />

                    {/* Card body */}
                    <div className="p-5 flex flex-col flex-1 gap-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          {/* Avatar con iniciales */}
                          <div className={`flex-shrink-0 w-11 h-11 rounded-2xl bg-gradient-to-br ${color.bg} flex items-center justify-center shadow-sm`}>
                            <span className="text-white font-black text-sm leading-none">
                              {getInitials(p.name)}
                            </span>
                          </div>
                          <div className="min-w-0 flex-1 pt-0.5">
                            <p className="font-bold text-gray-900 text-base leading-snug">{p.name}</p>
                            {p.description ? (
                              <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{p.description}</p>
                            ) : (
                              <p className="text-sm text-gray-400 italic mt-0.5">Sin descripción</p>
                            )}
                          </div>
                        </div>
                        {isSuperAdmin && (
                          <div className="flex gap-1 flex-shrink-0">
                            <button
                              onClick={() => startEdit(p)}
                              title="Editar"
                              className="p-2 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => setDeletingId(p.id)}
                              title="Eliminar"
                              className="p-2 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Admin y fecha */}
                      <div className="flex items-center gap-3 text-xs text-gray-400">
                        {adminUser && (
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            <span className="font-medium text-gray-600">{adminUser.name}</span>
                          </span>
                        )}
                        {adminUser && p.created_at && <span>·</span>}
                        {p.created_at && (
                          <span>{formatDate(p.created_at)}</span>
                        )}
                      </div>

                      {/* CTA */}
                      <button
                        onClick={() => navigate(`/app/admin/proyectos/${p.id}/comidas`)}
                        className="mt-auto w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold bg-[#0D1B2A] text-white hover:bg-[#1a3a5c] transition-all"
                      >
                        <UtensilsCrossed className="h-4 w-4" />
                        Ver comidas
                        <ChevronRight className="h-3.5 w-3.5 ml-auto" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>

      {/* Dialog: Crear proyecto */}
      <Dialog
        open={showCreate}
        onOpenChange={open => { if (!open) { setShowCreate(false); setCreateForm(EMPTY_FORM) } }}
      >
        <DialogContent className="max-w-md w-full">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-gray-800">Nuevo proyecto</DialogTitle>
          </DialogHeader>
          <ProjectFormFields form={createForm} onChange={setCreateForm} users={users} />
          <div className="flex justify-end gap-2 mt-4">
            <button
              onClick={() => { setShowCreate(false); setCreateForm(EMPTY_FORM) }}
              className="px-4 py-2.5 rounded-xl text-sm font-semibold border border-gray-200 text-gray-700 hover:bg-gray-50 transition-all"
            >
              Cancelar
            </button>
            <button
              onClick={handleCreate}
              disabled={createMutation.isPending || !createForm.name || !createForm.admin_user_id}
              className="px-5 py-2.5 bg-[#0D1B2A] text-white text-sm font-semibold rounded-xl disabled:opacity-60 hover:bg-[#1a3a5c] transition-all"
            >
              {createMutation.isPending
                ? <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Creando...</span>
                : 'Crear proyecto'}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog: Editar proyecto */}
      <Dialog
        open={Boolean(editingProject)}
        onOpenChange={open => { if (!open) { setEditingProject(null); setEditForm(EMPTY_FORM) } }}
      >
        <DialogContent className="max-w-md w-full">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-gray-800">
              Editando: <span className="text-amber-700">{editingProject?.name}</span>
            </DialogTitle>
          </DialogHeader>
          <ProjectFormFields form={editForm} onChange={setEditForm} users={users} />
          <div className="flex justify-end gap-2 mt-4">
            <button
              onClick={() => { setEditingProject(null); setEditForm(EMPTY_FORM) }}
              className="px-4 py-2.5 rounded-xl text-sm font-semibold border border-gray-200 text-gray-700 hover:bg-gray-50 transition-all"
            >
              Cancelar
            </button>
            <button
              onClick={handleUpdate}
              disabled={updateMutation.isPending || !editForm.name || !editForm.admin_user_id}
              className="px-5 py-2.5 bg-[#0D1B2A] text-white text-sm font-semibold rounded-xl disabled:opacity-60 hover:bg-[#1a3a5c] transition-all"
            >
              {updateMutation.isPending
                ? <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Guardando...</span>
                : 'Guardar cambios'}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog: Confirmar eliminación */}
      <Dialog
        open={Boolean(deletingId)}
        onOpenChange={open => { if (!open) setDeletingId(null) }}
      >
        <DialogContent className="max-w-sm w-full">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-gray-800">Eliminar proyecto</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-500 mt-1">
            ¿Seguro que querés eliminar este proyecto? Esta acción no se puede deshacer.
          </p>
          <div className="flex justify-end gap-2 mt-4">
            <button
              onClick={() => setDeletingId(null)}
              className="px-4 py-2 rounded-xl text-sm font-semibold border border-gray-200 text-gray-700 hover:bg-gray-50 transition-all"
            >
              Cancelar
            </button>
            <button
              onClick={() => deletingId && deleteMutation.mutate(deletingId)}
              disabled={deleteMutation.isPending}
              className="px-4 py-2 rounded-xl text-sm font-semibold bg-red-600 text-white hover:bg-red-700 disabled:opacity-60 transition-all"
            >
              {deleteMutation.isPending
                ? <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Eliminando...</span>
                : 'Eliminar'}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
