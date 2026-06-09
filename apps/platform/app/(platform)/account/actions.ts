'use server'

import { db, users } from '@roaring/db'
import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { requireUser, setAuditUser } from '@roaring/auth'

export async function updateUserName(userId: string, fullName: string) {
  const user = await requireUser()

  await db.transaction(async (tx) => {
    await setAuditUser(tx, user.id)
    await tx.update(users).set({ fullName }).where(eq(users.id, userId))
  })

  revalidatePath('/account')
}
