'use server'

import { inviteUser } from '@roaring/auth/server'
import { requireRole } from '@roaring/auth'
import type { UserRole } from '@roaring/auth'
import { revalidatePath, revalidateTag } from 'next/cache'

export async function inviteUserAction(data: {
  email: string
  fullName: string
  role: UserRole
  department?: string
  team?: string
}) {
  // Must be admin — derives tenantId and identity from session, never client
  const currentUser = await requireRole('admin')

  const result = await inviteUser({
    email: data.email,
    fullName: data.fullName,
    role: data.role,
    department: data.department,
    team: data.team,
    tenantId: currentUser.tenantId, // from session, not payload
    invitedById: currentUser.id, // from session, not payload
    invitedByEmail: currentUser.email, // from session, not payload
    invitedByName: currentUser.fullName, // from session, not payload
  })

  if (result.success) {
    revalidateTag(`users-${currentUser.tenantId}`, 'max')
    revalidatePath('/users')
  }

  return result
}
