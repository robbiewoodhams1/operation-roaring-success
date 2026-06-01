'use server'

import { inviteUser } from '@roaring/auth/server'
import type { UserRole } from '@roaring/auth'

export async function inviteUserAction(data: {
  email: string
  fullName: string
  role: UserRole
  tenantId: string
  department?: string
  team?: string
  invitedById: string
  invitedByEmail: string
  invitedByName: string
}) {
  return inviteUser(data)
}
