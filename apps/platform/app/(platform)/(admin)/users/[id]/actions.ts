'use server'

import { db, users } from '@roaring/db'
import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { requireRole, setAuditUser, UserRole } from '@roaring/auth'
import { resendInvite } from '@roaring/auth/server'

export async function updateUser(id: string, data: { fullName: string; role: string }) {
  const currentUser = await requireRole('admin')

  await db.transaction(async (tx) => {
    await setAuditUser(tx, currentUser.id)
    await tx
      .update(users)
      .set({
        fullName: data.fullName,
        role: data.role as any,
      })
      .where(eq(users.id, id))
  })

  revalidatePath('/users')
  revalidatePath(`/users/${id}`)
}

export async function toggleUserSuspension(id: string, currentlyActive: boolean) {
  const currentUser = await requireRole('admin')

  await db.transaction(async (tx) => {
    await setAuditUser(tx, currentUser.id)
    await tx
      .update(users)
      .set({
        isActive: !currentlyActive,
      })
      .where(eq(users.id, id))
  })

  revalidatePath('/users')
  revalidatePath(`/users/${id}`)
}

export async function resendUserInvite(email: string) {
  await requireRole('admin')
  return resendInvite(email)
}
