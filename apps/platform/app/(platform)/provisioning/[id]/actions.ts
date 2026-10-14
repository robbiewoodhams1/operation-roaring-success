'use server'

import { db, provisioning, provisioningServices, users } from '@roaring/db'
import type {
  WcOutcome,
  RouterDispatched,
  ProvisioningStatus,
  ServiceStatus,
  CancelledBy,
} from '@roaring/db'
import { and, eq, inArray } from 'drizzle-orm'
import { revalidatePath, revalidateTag } from 'next/cache'
import { requireUser, setAuditUser } from '@roaring/auth'

/** The provisioning record's tenant check — every write goes through this. */
async function provisioningInTenant(id: string, tenantId: string) {
  const [row] = await db
    .select({
      id: provisioning.id,
      provisionerUserId: provisioning.provisionerUserId,
      routerAssignedUserId: provisioning.routerAssignedUserId,
    })
    .from(provisioning)
    .where(and(eq(provisioning.id, id), eq(provisioning.tenantId, tenantId)))
    .limit(1)
  if (!row) throw new Error('Provisioning record not found')
  return row
}

async function serviceInTenant(serviceId: string, tenantId: string) {
  const [row] = await db
    .select({ id: provisioningServices.id })
    .from(provisioningServices)
    .innerJoin(provisioning, eq(provisioning.id, provisioningServices.provisioningId))
    .where(and(eq(provisioningServices.id, serviceId), eq(provisioning.tenantId, tenantId)))
    .limit(1)
  if (!row) throw new Error('Provisioning service not found')
}

export async function updateProvisioning(
  id: string,
  data: {
    wc1Outcome: string | null
    wc1Comments: string | null
    wc2Outcome: string | null
    wc2Comments: string | null
    wc3Outcome: string | null
    wc3Comments: string | null
    status: string
    proposedLiveDate: string | null
    dateOrdered: string | null
    orderFaultRef: string | null
    orderComments: string | null
    /** User ids. Stats credit for service milestones goes to the provisioner. */
    provisionerUserId: string | null
    routerAssignedUserId: string | null
    lastCheckedAt: string | null
    lastCheckedBy: string | null
    routerDispatched: string | null
    routerDispatchRef: string | null
    routerTrackingNumber: string | null
    routerOrderedDate: string | null
  }
) {
  const user = await requireUser()
  const current = await provisioningInTenant(id, user.tenantId)

  // A newly chosen user must be an active, approved employee of this tenant;
  // an unchanged assignment is kept even if that person has since left.
  const requested = [data.provisionerUserId, data.routerAssignedUserId].filter(
    (v): v is string => !!v
  )
  const known =
    requested.length > 0
      ? await db
          .select({
            id: users.id,
            fullName: users.fullName,
            isActive: users.isActive,
            approvalStatus: users.approvalStatus,
          })
          .from(users)
          .where(and(inArray(users.id, requested), eq(users.tenantId, user.tenantId)))
      : []
  function resolve(id: string | null, currentId: string | null) {
    if (!id) return null
    const person = known.find((k) => k.id === id)
    const eligible =
      person && (id === currentId || (person.isActive && person.approvalStatus === 'approved'))
    if (!eligible) throw new Error('Choose an employee from the list')
    return person
  }
  const provisioner = resolve(data.provisionerUserId, current.provisionerUserId)
  const routerAssignee = resolve(data.routerAssignedUserId, current.routerAssignedUserId)

  await db.transaction(async (tx) => {
    await setAuditUser(tx, user.id)

    await tx
      .update(provisioning)
      .set({
        wc1Outcome: (data.wc1Outcome || null) as WcOutcome | null,
        wc1Comments: data.wc1Comments || null,
        wc2Outcome: (data.wc2Outcome || null) as WcOutcome | null,
        wc2Comments: data.wc2Comments || null,
        wc3Outcome: (data.wc3Outcome || null) as WcOutcome | null,
        wc3Comments: data.wc3Comments || null,
        status: data.status as ProvisioningStatus,
        proposedLiveDate: data.proposedLiveDate || null,
        dateOrdered: data.dateOrdered || null,
        orderFaultRef: data.orderFaultRef || null,
        orderComments: data.orderComments || null,
        provisionerUserId: provisioner?.id ?? null,
        // Display snapshot; a legacy free-text name is kept until someone is linked.
        ...(provisioner && { provisioner: provisioner.fullName }),
        routerAssignedUserId: routerAssignee?.id ?? null,
        lastCheckedAt: data.lastCheckedAt ? new Date(data.lastCheckedAt) : null,
        lastCheckedBy: data.lastCheckedBy || null,
        routerDispatched: (data.routerDispatched || 'no') as RouterDispatched,
        routerDispatchRef: data.routerDispatchRef || null,
        routerTrackingNumber: data.routerTrackingNumber || null,
        routerOrderedDate: data.routerOrderedDate || null,
      })
      .where(and(eq(provisioning.id, id), eq(provisioning.tenantId, user.tenantId)))
  })

  revalidateTag(`provisioning-${user.tenantId}`, 'max')
  revalidatePath('/provisioning')
  revalidatePath('/home')
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
  await serviceInTenant(id, user.tenantId)

  await db.transaction(async (tx) => {
    await setAuditUser(tx, user.id)

    await tx
      .update(provisioningServices)
      .set({
        status: data.status as ServiceStatus,
        reference: data.reference || null,
        dateOrdered: data.dateOrdered || null,
        liveDate: data.liveDate || null,
        lastCheckedAt: data.lastCheckedAt || null,
        cancelledDate: data.cancelledDate || null,
        cancelledBy: (data.cancelledBy || null) as CancelledBy | null,
        cancellationReason: data.cancellationReason || null,
        delayedDate: data.delayedDate || null,
        presumedSolveDate: data.presumedSolveDate || null,
        delayReason: data.delayReason || null,
        notes: data.notes || null,
      })
      .where(eq(provisioningServices.id, id))
  })

  revalidateTag(`provisioningServices-${user.tenantId}`, 'max')
  revalidatePath('/provisioning')
  revalidatePath('/home')
}

export async function addProvisioningServiceAttempt(
  provisioningId: string,
  serviceType: 'bb' | 'whc' | 'nfon' | 'mpf_broadband' | 'mpf_voice' | 'mobile',
  currentMaxAttempt: number
) {
  const user = await requireUser()
  await provisioningInTenant(provisioningId, user.tenantId)

  await db.transaction(async (tx) => {
    await setAuditUser(tx, user.id)

    await tx.insert(provisioningServices).values({
      provisioningId,
      serviceType,
      status: 'not_applied',
      attempt: currentMaxAttempt + 1,
    })
  })

  revalidateTag(`provisioningServices-${user.tenantId}`, 'max')
  revalidatePath('/provisioning')
  revalidatePath('/home')
}
