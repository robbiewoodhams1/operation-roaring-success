'use server'

import { db, faults, faultComments } from '@roaring/db'
import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { requireUser, setAuditUser } from '@roaring/auth'

export async function createFault(data: {
  provisioningId: string | null
  assignedTo: string | null
  title: string
  type: string
  description: string | null
}) {
  const user = await requireUser()

  await db.transaction(async (tx) => {
    await setAuditUser(tx, user.id)
    const [newFault] = await tx
      .insert(faults)
      .values({
        tenantId: user.tenantId,
        provisioningId: data.provisioningId || null,
        assignedTo: data.assignedTo || null,
        title: data.title,
        type: data.type as any,
        status: 'outstanding',
        createdBy: user.id,
      })
      .returning({ id: faults.id })

    if (data.description && newFault) {
      await tx.insert(faultComments).values({
        faultId: newFault.id,
        authorId: user.id,
        body: data.description,
      })
    }
  })

  revalidatePath('/faults')
}

export async function updateFaultStatus(id: string, status: string, resolvedAt?: string) {
  const user = await requireUser()

  await db.transaction(async (tx) => {
    await setAuditUser(tx, user.id)
    await tx
      .update(faults)
      .set({
        status: status as any,
        resolvedAt: status === 'resolved' ? (resolvedAt ? new Date(resolvedAt) : new Date()) : null,
        updatedAt: new Date(),
      })
      .where(eq(faults.id, id))
  })

  revalidatePath('/faults')
  revalidatePath(`/faults/${id}`)
}

export async function updateFault(
  id: string,
  data: {
    title: string
    type: string
    assignedTo: string | null
    ticketRef: string | null
    ticketRaisedAt: string | null
  }
) {
  const user = await requireUser()

  await db.transaction(async (tx) => {
    await setAuditUser(tx, user.id)
    await tx
      .update(faults)
      .set({
        title: data.title,
        type: data.type as any,
        assignedTo: data.assignedTo || null,
        ticketRef: data.ticketRef || null,
        ticketRaisedAt: data.ticketRaisedAt ? new Date(data.ticketRaisedAt) : null,
        updatedAt: new Date(),
      })
      .where(eq(faults.id, id))
  })

  revalidatePath('/faults')
  revalidatePath(`/faults/${id}`)
}
