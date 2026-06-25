'use server'

import { db, transferCeases, transferCeaseComments } from '@roaring/db'
import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { requireUser, setAuditUser } from '@roaring/auth'

export async function createTransferCease(data: {
  provisioningId: string | null
  assignedTo: string | null
  type: string
  description: string | null
}) {
  const user = await requireUser()

  await db.transaction(async (tx) => {
    await setAuditUser(tx, user.id)
    const [newRecord] = await tx
      .insert(transferCeases)
      .values({
        tenantId: user.tenantId,
        provisioningId: data.provisioningId || null,
        assignedTo: data.assignedTo || null,
        type: data.type as any,
        status: 'open',
        createdBy: user.id,
      })
      .returning({ id: transferCeases.id })

    if (data.description && newRecord) {
      await tx.insert(transferCeaseComments).values({
        transferCeaseId: newRecord.id,
        authorId: user.id,
        body: data.description,
      })
    }
  })

  revalidatePath('/routers')
}

export async function updateTransferCeaseStatus(id: string, status: string) {
  const user = await requireUser()

  await db.transaction(async (tx) => {
    await setAuditUser(tx, user.id)
    await tx
      .update(transferCeases)
      .set({
        status: status as any,
        completedAt: status === 'completed' ? new Date() : null,
        updatedAt: new Date(),
      })
      .where(eq(transferCeases.id, id))
  })

  revalidatePath('/routers')
  revalidatePath(`/routers/${id}`)
}

export async function updateTransferCease(
  id: string,
  data: {
    type: string
    assignedTo: string | null
  }
) {
  const user = await requireUser()

  await db.transaction(async (tx) => {
    await setAuditUser(tx, user.id)
    await tx
      .update(transferCeases)
      .set({
        type: data.type as any,
        assignedTo: data.assignedTo || null,
        updatedAt: new Date(),
      })
      .where(eq(transferCeases.id, id))
  })

  revalidatePath('/routers')
  revalidatePath(`/routers/${id}`)
}
