import { FolderKanban, Plus } from 'lucide-react'

import { PageHeader } from '@/components/PageHeader'
import { ActionButton } from '@/components/ActionButton'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { DataToolbar } from '@/components/data/DataToolbar'
import { ErrorBanner } from '@/components/data/ErrorBanner'
import { PaginationControls } from '@/components/data/PaginationControls'
import { AdminProjectsList } from '@/features/projects/components/admin/AdminProjectsList'
import { CreateProjectDialog } from '@/features/projects/components/admin/CreateProjectDialog'
import { useAdminProyectosPage } from '@/features/projects/hooks/useAdminProyectosPage'
import { ApiError } from '@/lib/api/apiClient'
import { useAuth } from '@/hooks/useAuth'

export default function AdminProyectosPage() {
  const { token, isRestoring } = useAuth()

  const {
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
  } = useAdminProyectosPage({ token, isRestoring })

  return (
    <div className="min-h-screen pb-24">
      <PageHeader
        icon={FolderKanban}
        title="Proyectos"
        subtitle="Equipos, miembros y gestión operativa por proyecto."
        action={
          <ActionButton intent="primary" onClick={() => setCreateOpen(true)}>
            <Plus className="w-4 h-4" />
            <span className="hidden xs:inline ml-1">Nuevo proyecto</span>
            <span className="xs:hidden ml-1">Nuevo</span>
          </ActionButton>
        }
      />

      <div className="px-3 py-4 sm:px-4 lg:px-6 lg:py-6 max-w-5xl mx-auto space-y-4">
        <DataToolbar
          search={search}
          onSearch={setSearch}
          searchPlaceholder="Buscar por nombre o descripción…"
          countLabel={countLabel}
        />

        {listQ.isError && (
          <ErrorBanner
            message={listQ.error instanceof ApiError ? listQ.error.message : 'Error al cargar proyectos'}
          />
        )}

        <AdminProjectsList
          rows={rows}
          isLoading={listQ.isLoading}
          emptyMessage={emptyMessage}
          onRequestDelete={setDeleteTarget}
        />

        <PaginationControls
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
        />
      </div>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(o) => {
          if (!o) setDeleteTarget(null)
        }}
        title={deleteTarget ? `¿Eliminar "${deleteTarget.name}"?` : ''}
        description="Se perderán los vínculos con jornadas y miembros según las reglas del servidor. Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        destructive
        loading={delM.isPending}
        onConfirm={() => {
          if (deleteTarget) {
            delM.mutate(deleteTarget.id, {
              onSuccess: () => setDeleteTarget(null),
            })
          }
        }}
      />

      <CreateProjectDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        name={name}
        onNameChange={setName}
        description={description}
        onDescriptionChange={setDescription}
        coordinatorId={coordinatorId}
        onCoordinatorIdChange={setCoordinatorId}
        users={usersQ.data ?? []}
        usersLoading={usersQ.isLoading}
        createM={createM}
      />
    </div>
  )
}
