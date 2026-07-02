'use server'

import { db, transferCeaseComments } from '@roaring/db'
import { eq } from 'drizzle-orm'
import { revalidatePath, revalidateTag } from 'next/cache'
import { requireUser, setAuditUser } from '@roaring/auth'

export async function addComment(transferCeaseId: string, body: string) {
  const user = await requireUser()

  await db.transaction(async (tx) => {
    await setAuditUser(tx, user.id)
    await tx.insert(transferCeaseComments).values({
      transferCeaseId,
      authorId: user.id,
      body,
    })
  })

  revalidateTag(`transferCeaseComments-${user.tenantId}`, 'max')
  revalidatePath(`/transfers-ceases/${transferCeaseId}`)
}

export async function deleteComment(id: string, transferCeaseId: string) {
  const user = await requireUser()

  await db.transaction(async (tx) => {
    await setAuditUser(tx, user.id)
    await tx.delete(transferCeaseComments).where(eq(transferCeaseComments.id, id))
  })

  revalidateTag(`transferCeaseComments-${user.tenantId}`, 'max')
  revalidatePath(`/transfers-ceases/${transferCeaseId}`)
}
