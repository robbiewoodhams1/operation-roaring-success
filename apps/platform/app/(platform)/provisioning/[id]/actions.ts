'use server'

import { db, provisioning, provisioningServices } from '@roaring/db'
import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { requireUser, setAuditUser } from '@roaring/auth'

export async function updateProvisioning(
  id: string,
  data: {
    wc1Outcome: string | null
    wc1Comments: string | null
    wc2Outcome: string | null
    wc2Comments: string | null
    status: string
    proposedLiveDate: string | null
    dateOrdered: string | null
    orderFaultRef: string | null
    orderComments: string | null
    provisioner: string | null
    lastCheckedAt: string | null
    lastCheckedBy: string | null
    routerDispatched: boolean
    routerDispatchRef: string | null
    routerTrackingNumber: string | null
  }
) {
  const user = await requireUser()

  await db.transaction(async (tx) => {
    await setAuditUser(tx, user.id)

    await tx
      .update(provisioning)
      .set({
        wc1Outcome: (data.wc1Outcome || null) as any,
        wc1Comments: data.wc1Comments || null,
        wc2Outcome: (data.wc2Outcome || null) as any,
        wc2Comments: data.wc2Comments || null,
        status: data.status as any,
        proposedLiveDate: data.proposedLiveDate || null,
        dateOrdered: data.dateOrdered || null,
        orderFaultRef: data.orderFaultRef || null,
        orderComments: data.orderComments || null,
        provisioner: data.provisioner || null,
        lastCheckedAt: data.lastCheckedAt ? new Date(data.lastCheckedAt) : null,
        lastCheckedBy: data.lastCheckedBy || null,
        routerDispatched: data.routerDispatched,
        routerDispatchRef: data.routerDispatchRef || null,
        routerTrackingNumber: data.routerTrackingNumber || null,
      })
      .where(eq(provisioning.id, id))
  })

  revalidatePath('/provisioning')
}

export async function updateProvisioningService(
  id: string,
  data: {
    status: string
    reference: string | null
    dateOrdered: string | null
    liveDate: string | null
    lastCheckedAt: string | null
    cancelledDate: string | null
    cancelledBy: string | null
    cancellationReason: string | null
    delayedDate: string | null
    presumedSolveDate: string | null
    delayReason: string | null
    notes: string | null
  }
) {
  const user = await requireUser()

  await db.transaction(async (tx) => {
    await setAuditUser(tx, user.id)

    await tx
      .update(provisioningServices)
      .set({
        status: data.status as any,
        reference: data.reference || null,
        dateOrdered: data.dateOrdered || null,
        liveDate: data.liveDate || null,
        lastCheckedAt: data.lastCheckedAt || null,
        cancelledDate: data.cancelledDate || null,
        cancelledBy: (data.cancelledBy || null) as any,
        cancellationReason: data.cancellationReason || null,
        delayedDate: data.delayedDate || null,
        presumedSolveDate: data.presumedSolveDate || null,
        delayReason: data.delayReason || null,
        notes: data.notes || null,
      })
      .where(eq(provisioningServices.id, id))
  })

  revalidatePath('/provisioning')
}

export async function addProvisioningServiceAttempt(
  provisioningId: string,
  serviceType: 'bb' | 'whc' | 'nfon' | 'mpf',
  currentMaxAttempt: number
) {
  const user = await requireUser()

  await db.transaction(async (tx) => {
    await setAuditUser(tx, user.id)

    await tx.insert(provisioningServices).values({
      provisioningId,
      serviceType,
      status: 'not_applied',
      attempt: currentMaxAttempt + 1,
    })
  })

  revalidatePath('/provisioning')
}
