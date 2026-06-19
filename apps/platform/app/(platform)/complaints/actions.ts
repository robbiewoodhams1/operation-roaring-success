'use server'

import { db, complaints, complaintComments } from '@roaring/db'
import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { requireUser, setAuditUser } from '@roaring/auth'

export async function createComplaint(data: {
  provisioningId: string | null
  assignedTo: string | null
  title: string
  type: string
  description: string | null
}) {
  const user = await requireUser()

  await db.transaction(async (tx) => {
    await setAuditUser(tx, user.id)
    const [newComplaint] = await tx
      .insert(complaints)
      .values({
        tenantId: user.tenantId,
        provisioningId: data.provisioningId || null,
        assignedTo: data.assignedTo || null,
        title: data.title,
        type: data.type as any,
        status: 'open',
        createdBy: user.id,
      })
      .returning({ id: complaints.id })

    if (data.description && newComplaint) {
      await tx.insert(complaintComments).values({
        complaintId: newComplaint.id,
        authorId: user.id,
        body: data.description,
      })
    }
  })

  revalidatePath('/complaints')
}

export async function updateComplaintStatus(id: string, status: string) {
  const user = await requireUser()

  await db.transaction(async (tx) => {
    await setAuditUser(tx, user.id)
    await tx
      .update(complaints)
      .set({
        status: status as any,
        closedAt: status === 'closed' ? new Date() : null,
        updatedAt: new Date(),
      })
      .where(eq(complaints.id, id))
  })

  revalidatePath('/complaints')
  revalidatePath(`/complaints/${id}`)
}

export async function updateComplaint(
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
      .update(complaints)
      .set({
        title: data.title,
        type: data.type as any,
        assignedTo: data.assignedTo || null,
        ticketRef: data.ticketRef || null,
        ticketRaisedAt: data.ticketRaisedAt ? new Date(data.ticketRaisedAt) : null,
        updatedAt: new Date(),
      })
      .where(eq(complaints.id, id))
  })

  revalidatePath('/complaints')
  revalidatePath(`/complaints/${id}`)
}
