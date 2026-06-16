import { Upload, UserPlus, Users } from 'lucide-react'

import { PageHeader } from '@/components/PageHeader'
import { ActionButton } from '@/components/ActionButton'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { DataToolbar } from '@/components/data/DataToolbar'
import { ErrorBanner } from '@/components/data/ErrorBanner'
import { PaginationControls } from '@/components/data/PaginationControls'
import { Drawer, DrawerContent } from '@/components/ui/drawer'
import { BulkInviteDialog } from '@/features/users/components/BulkInviteDialog'
import { InviteDialog } from '@/features/users/components/admin/InviteDialog'
import { UserDrawerContent } from '@/features/users/components/admin/UserDrawerContent'
import { UsersTable } from '@/features/users/components/admin/UsersTable'
import { useAdminUsuariosPage } from '@/features/users/hooks/useAdminUsuariosPage'
import { useAuth } from '@/hooks/useAuth'
import { useIsDesktop } from '@/hooks/useIsMobile'

export default function AdminUsuariosPage() {
  const { token, user: me, isRestoring } = useAuth()
  const isDesktop = useIsDesktop()

  const {
    isAdmin,
    selected,
    inviteOpen,
    setInviteOpen,
    bulkOpen,
    setBulkOpen,
    inviteName,
    setInviteName,
    inviteEmail,
    setInviteEmail,
    inviteRole,
    setInviteRole,
    usersQuery,
    userProjectsQuery,
    roleMutation,
    statusMutation,
    drawer,
    search,
    setSearch,
    page,
    setPage,
    totalPages,
    pageRows,
    countLabel,
    handleInviteSubmit,
    closeInviteDialog,
    totalUsers,
    isOwnAccount,
    userProjectsByUser,
    inviteMutation,
    invalidateUsers,
  } = useAdminUsuariosPage({ token, me, isRestoring })

  return (
    <div className="min-h-screen">
      <PageHeader
        icon={Users}
        title="Usuarios"
        subtitle="Invitaciones, permisos y estado de cuenta."
        action={
          <div className="flex items-center gap-2">
            <ActionButton intent="secondary" onClick={() => setBulkOpen(true)}>
              <Upload className="w-4 h-4 mr-1" />
              Importar
            </ActionButton>
            <ActionButton intent="primary" onClick={() => setInviteOpen(true)}>
              <UserPlus className="w-4 h-4 mr-1" />
              Agregar usuario
            </ActionButton>
          </div>
        }
      />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-5">
        {usersQuery.isError && (
          <ErrorBanner message="No se pudo cargar la lista de usuarios." />
        )}

        {!usersQuery.isError && (
          <>
            {!usersQuery.isPending && (
              <DataToolbar
                search={search}
                onSearch={setSearch}
                searchPlaceholder="Buscar por nombre o correo"
                countLabel={countLabel}
              />
            )}

            <UsersTable
              pageRows={pageRows}
              totalUsers={totalUsers}
              isPending={usersQuery.isPending}
              onOpenDrawer={drawer.openDrawer}
            />

            {totalPages > 1 && pageRows.length > 0 && (
              <PaginationControls
                page={page}
                totalPages={totalPages}
                onPageChange={setPage}
                compact
              />
            )}
          </>
        )}
      </div>

      <Drawer
        open={Boolean(selected)}
        onOpenChange={(o) => !o && drawer.closeDrawer()}
        direction={isDesktop ? 'right' : 'bottom'}
      >
        <DrawerContent className="px-0 pb-0 flex flex-col">
          {selected && (
            <UserDrawerContent
              user={selected}
              isOwnAccount={isOwnAccount}
              isAdmin={isAdmin}
              projectsLoading={userProjectsQuery.isPending}
              projectLinks={userProjectsByUser?.[selected.id]}
              edit={drawer.edit}
              password={drawer.password}
              onClose={drawer.closeDrawer}
              onConfirmDeactivate={() => drawer.setConfirmDeactivateOpen(true)}
              onReactivate={() => statusMutation.mutate({ id: selected.id, active: true })}
              statusPending={statusMutation.isPending}
              onRoleChange={(role) => roleMutation.mutate({ id: selected.id, role })}
              rolePending={roleMutation.isPending}
            />
          )}
        </DrawerContent>
      </Drawer>

      <BulkInviteDialog
        open={bulkOpen}
        onOpenChange={setBulkOpen}
        token={token!}
        onDone={invalidateUsers}
      />

      <InviteDialog
        open={inviteOpen}
        onOpenChange={closeInviteDialog}
        name={inviteName}
        email={inviteEmail}
        role={inviteRole}
        onName={setInviteName}
        onEmail={setInviteEmail}
        onRole={setInviteRole}
        onSubmit={handleInviteSubmit}
        onCancel={() => setInviteOpen(false)}
        isPending={inviteMutation.isPending}
      />

      <ConfirmDialog
        open={drawer.confirmDeactivateOpen}
        onOpenChange={drawer.setConfirmDeactivateOpen}
        title="¿Desactivar esta cuenta?"
        description={
          selected ? (
            <>
              <span className="font-medium text-foreground">{selected.name}</span>
              {' — '}
              <span className="break-all">{selected.email}</span>
              {' '}no podrá iniciar sesión. Podés volver a activarla cuando quieras.
            </>
          ) : null
        }
        confirmLabel="Desactivar"
        loadingLabel="Desactivar"
        destructive
        loading={statusMutation.isPending}
        onConfirm={() => {
          if (!selected) return
          statusMutation.mutate({ id: selected.id, active: false })
          drawer.setConfirmDeactivateOpen(false)
        }}
      />
    </div>
  )
}
