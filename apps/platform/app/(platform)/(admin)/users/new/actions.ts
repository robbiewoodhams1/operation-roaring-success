'use server'

import { inviteUser } from '@roaring/auth/server'
import type { UserRole } from '@roaring/auth'
import { revalidatePath, revalidateTag } from 'next/cache'

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
  const result = await inviteUser(data)

  if (result.success) {
    revalidateTag(`users-${data.tenantId}`, 'max')
    revalidatePath('/users')
  }

  return result
}
