import { Upload, UserPlus, Users } from 'lucide-react'

import { PageHeader } from '@/components/PageHeader'
import { ActionButton } from '@/components/ActionButton'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { DataToolbar } from '@/components/data/DataToolbar'
import { ErrorBanner } from '@/components/data/ErrorBanner'
import { PaginationControls } from '@/components/data/PaginationControls'
import { Drawer, DrawerContent } from '@/components/ui/drawer'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { BulkInviteDialog } from '@/features/users/components/BulkInviteDialog'
import { InviteDialog } from '@/features/users/components/admin/InviteDialog'
import { UserDrawerContent } from '@/features/users/components/admin/UserDrawerContent'
import { UsersTable } from '@/features/users/components/admin/UsersTable'
import { useAdminUsuariosPage } from '@/features/users/hooks/useAdminUsuariosPage'
import { SORT_MOBILE_VALUES, sortMobileLabel } from '@/features/users/lib/userHelpers'
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
    list,
    handleInviteSubmit,
    closeInviteDialog,
    sortMobileValue,
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
                search={list.search}
                onSearch={list.setSearch}
                searchPlaceholder="Buscar por nombre o correo"
                countLabel={
                  list.search.trim()
                    ? `${list.filteredSorted.length} resultado${list.filteredSorted.length !== 1 ? 's' : ''} de ${totalUsers} usuario${totalUsers !== 1 ? 's' : ''}`
                    : `${totalUsers} usuario${totalUsers !== 1 ? 's' : ''} en total`
                }
                filters={
                  <div className="shrink-0 w-full sm:w-auto md:hidden">
                    <Select
                      value={SORT_MOBILE_VALUES.includes(sortMobileValue) ? sortMobileValue : 'created_at:desc'}
                      onValueChange={list.handleMobileSortValue}
                    >
                      <SelectTrigger className="h-10 w-full sm:min-w-[14rem]" aria-label="Ordenar usuarios">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SORT_MOBILE_VALUES.map((v) => (
                          <SelectItem key={v} value={v}>
                            {sortMobileLabel(v)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                }
              />
            )}

            <UsersTable
              pageRows={list.pageItems}
              totalUsers={totalUsers}
              sortKey={list.sortKey}
              sortDir={list.sortDir}
              onColumnSort={list.handleColumnSort}
              isPending={usersQuery.isPending}
              onOpenDrawer={drawer.openDrawer}
            />

            {list.totalPages > 1 && list.pageItems.length > 0 && (
              <PaginationControls
                page={list.page}
                totalPages={list.totalPages}
                onPageChange={list.setPage}
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
