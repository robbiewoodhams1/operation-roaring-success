'use server'

import { db, provisioning } from '@roaring/db'
import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'

export async function updateProvisioning(
  id: string,
  data: {
    wc1Outcome: string | null
    wc1Comments: string | null
    wc2Outcome: string | null
    wc2Comments: string | null
    status: string
    installType: string | null
    bbAppliedFor: string | null
    bbOrderRef: string | null
    whcReference: string | null
    dateOrdered: string | null
    proposedLiveDate: string | null
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
  await db
    .update(provisioning)
    .set({
      wc1Outcome: (data.wc1Outcome || null) as any,
      wc1Comments: data.wc1Comments || null,
      wc2Outcome: (data.wc2Outcome || null) as any,
      wc2Comments: data.wc2Comments || null,
      status: data.status as any,
      installType: (data.installType || null) as any,
      bbAppliedFor: data.bbAppliedFor || null,
      bbOrderRef: data.bbOrderRef || null,
      whcReference: data.whcReference || null,
      dateOrdered: data.dateOrdered || null,
      proposedLiveDate: data.proposedLiveDate || null,
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

  revalidatePath(`/provisioning`)
}
