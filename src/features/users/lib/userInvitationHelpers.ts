import type { PendingInvitationDTO, UserDTO, UserInvitationStatus } from '@/lib/api/types'

export function mergeUsersWithOrphanInvitations(
  users: UserDTO[],
  invitations: PendingInvitationDTO[],
): UserDTO[] {
  const emails = new Set(users.map((u) => u.email.toLowerCase()))
  const orphanRows: UserDTO[] = invitations
    .filter((inv) => !emails.has(inv.email.toLowerCase()))
    .map((inv) => ({
      id: `invitation:${inv.id}`,
      name: inv.name,
      email: inv.email,
      role: inv.role,
      active: false,
      password_set: false,
      invitation_status: 'invited' as const,
      pending_invitation_id: inv.id,
      is_orphan_invitation: true,
      created_at: inv.created_at,
    }))

  return [...users, ...orphanRows]
}

const KNOWN_STATUSES: UserInvitationStatus[] = ['draft', 'invited', 'active', 'inactive']

export function getEffectiveInvitationStatus(user: UserDTO): UserInvitationStatus {
  if (user.invitation_status && KNOWN_STATUSES.includes(user.invitation_status)) {
    return user.invitation_status
  }
  if (user.pending_invitation_id) return 'invited'
  if (user.password_set === false) return 'draft'
  return user.active !== false ? 'active' : 'inactive'
}

export function isPendingAccessUser(user: UserDTO): boolean {
  const status = getEffectiveInvitationStatus(user)
  return status === 'draft' || status === 'invited'
}

export function canHardDeleteUser(user: UserDTO): boolean {
  if (user.is_orphan_invitation) return false
  return isPendingAccessUser(user) || user.password_set === false
}

export function canDeactivateUser(user: UserDTO): boolean {
  return getEffectiveInvitationStatus(user) === 'active' ||
    getEffectiveInvitationStatus(user) === 'inactive'
}

export function canSendInvitation(user: UserDTO): boolean {
  return getEffectiveInvitationStatus(user) === 'draft' && !user.is_orphan_invitation
}
