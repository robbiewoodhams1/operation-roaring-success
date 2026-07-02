'use server'

import { db, debtComments } from '@roaring/db'
import { eq } from 'drizzle-orm'
import { revalidatePath, revalidateTag } from 'next/cache'
import { requireUser, setAuditUser } from '@roaring/auth'

export async function addDebtComment(debtId: string, body: string) {
  const user = await requireUser()

  await db.transaction(async (tx) => {
    await setAuditUser(tx, user.id)
    await tx.insert(debtComments).values({ debtId, authorId: user.id, body })
  })

  revalidateTag(`debts-${user.tenantId}`, 'max')
  revalidatePath(`/debt/${debtId}`)
}

export async function deleteDebtComment(id: string, debtId: string) {
  const user = await requireUser()

  await db.transaction(async (tx) => {
    await setAuditUser(tx, user.id)
    await tx.delete(debtComments).where(eq(debtComments.id, id))
  })

  revalidateTag(`debts-${user.tenantId}`, 'max')
  revalidatePath(`/debt/${debtId}`)
}
