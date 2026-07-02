'use server'

import { db, complaintComments } from '@roaring/db'
import { eq } from 'drizzle-orm'
import { revalidatePath, revalidateTag } from 'next/cache'
import { requireUser, setAuditUser } from '@roaring/auth'

export async function addComplaintComment(complaintId: string, body: string) {
  const user = await requireUser()

  await db.transaction(async (tx) => {
    await setAuditUser(tx, user.id)
    await tx.insert(complaintComments).values({
      complaintId,
      authorId: user.id,
      body,
    })
  })

  revalidateTag(`complaints-${user.tenantId}`, 'max')
  revalidatePath(`/complaints/${complaintId}`)
}

export async function deleteComplaintComment(id: string, complaintId: string) {
  const user = await requireUser()

  await db.transaction(async (tx) => {
    await setAuditUser(tx, user.id)
    await tx.delete(complaintComments).where(eq(complaintComments.id, id))
  })

  revalidateTag(`complaints-${user.tenantId}`, 'max')
  revalidatePath(`/complaints/${complaintId}`)
}
