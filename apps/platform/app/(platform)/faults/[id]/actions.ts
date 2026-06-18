'use server'

import { db, faultComments } from '@roaring/db'
import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { requireUser, setAuditUser } from '@roaring/auth'

export async function addFaultComment(faultId: string, body: string) {
  const user = await requireUser()

  await db.transaction(async (tx) => {
    await setAuditUser(tx, user.id)
    await tx.insert(faultComments).values({
      faultId,
      authorId: user.id,
      body,
    })
  })

  revalidatePath(`/faults/${faultId}`)
}

export async function deleteFaultComment(id: string, faultId: string) {
  const user = await requireUser()

  await db.transaction(async (tx) => {
    await setAuditUser(tx, user.id)
    await tx.delete(faultComments).where(eq(faultComments.id, id))
  })

  revalidatePath(`/faults/${faultId}`)
}
