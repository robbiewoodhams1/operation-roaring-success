'use server'

import { db, debts, debtComments } from '@roaring/db'
import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { requireUser, setAuditUser } from '@roaring/auth'

export async function createDebt(data: {
  provisioningId: string | null
  assignedTo: string | null
  title: string
  totalOwed: string
  description: string | null
}) {
  const user = await requireUser()

  await db.transaction(async (tx) => {
    await setAuditUser(tx, user.id)
    const [newDebt] = await tx
      .insert(debts)
      .values({
        tenantId: user.tenantId,
        provisioningId: data.provisioningId || null,
        assignedTo: data.assignedTo || null,
        title: data.title,
        totalOwed: data.totalOwed,
        createdBy: user.id,
      })
      .returning({ id: debts.id })

    if (data.description && newDebt) {
      await tx.insert(debtComments).values({
        debtId: newDebt.id,
        authorId: user.id,
        body: data.description,
      })
    }
  })

  revalidatePath('/targets/debt')
}

export async function updateDebtOutcome(id: string, outcome: string) {
  const user = await requireUser()

  await db.transaction(async (tx) => {
    await setAuditUser(tx, user.id)
    await tx
      .update(debts)
      .set({
        outcome: outcome as any,
        closedAt: ['payment', 'payment_plan', 'uncollectable', 'deceased', 'free_bill'].includes(
          outcome
        )
          ? new Date()
          : null,
        updatedAt: new Date(),
      })
      .where(eq(debts.id, id))
  })

  revalidatePath('/targets/debt')
  revalidatePath(`/targets/debt/${id}`)
}

export async function updateDebt(
  id: string,
  data: {
    title: string
    totalOwed: string
    assignedTo: string | null
    outcome: string | null
    paymentTried: boolean
    paymentType: string | null
    dateOfPayment: string | null
  }
) {
  const user = await requireUser()

  await db.transaction(async (tx) => {
    await setAuditUser(tx, user.id)
    await tx
      .update(debts)
      .set({
        title: data.title,
        totalOwed: data.totalOwed,
        assignedTo: data.assignedTo || null,
        outcome: (data.outcome || null) as any,
        paymentTried: data.paymentTried,
        paymentType: (data.paymentType || null) as any,
        dateOfPayment: data.dateOfPayment || null,
        updatedAt: new Date(),
      })
      .where(eq(debts.id, id))
  })

  revalidatePath('/targets/debt')
  revalidatePath(`/targets/debt/${id}`)
}
