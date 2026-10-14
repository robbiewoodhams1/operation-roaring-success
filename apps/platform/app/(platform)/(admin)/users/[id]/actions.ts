'use server'

import { db, users, teams } from '@roaring/db'
import { and, eq } from 'drizzle-orm'
import { revalidatePath, revalidateTag } from 'next/cache'
import { requireRole, setAuditUser, deletePendingUser } from '@roaring/auth'

export async function updateUser(
  id: string,
  data: { fullName: string; role: string; teamId?: string | null }
) {
  const currentUser = await requireRole('admin')

  // Moving someone between teams is recorded as membership history by the
  // database, so their past results stay with the team they earned them in.
  if (data.teamId) {
    const [team] = await db
      .select({ id: teams.id })
      .from(teams)
      .where(and(eq(teams.id, data.teamId), eq(teams.tenantId, currentUser.tenantId)))
      .limit(1)
    if (!team) throw new Error('Team not found')
  }

  await db.transaction(async (tx) => {
    await setAuditUser(tx, currentUser.id)
    await tx
      .update(users)
      .set({
        fullName: data.fullName,
        role: data.role as any,
        ...(data.teamId !== undefined && { teamId: data.teamId }),
      })
      .where(and(eq(users.id, id), eq(users.tenantId, currentUser.tenantId)))
  })

  revalidateTag(`users-${currentUser.tenantId}`, 'max')
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
      .where(and(eq(users.id, id), eq(users.tenantId, currentUser.tenantId)))
  })

  revalidateTag(`users-${currentUser.tenantId}`, 'max')
  revalidatePath('/users')
  revalidatePath(`/users/${id}`)
}

export async function deletePendingUserAction(id: string) {
  const currentUser = await requireRole('admin')
  await deletePendingUser(id)
  revalidateTag(`users-${currentUser.tenantId}`, 'max')
  revalidatePath('/users')
}
