import { requireUser } from '@roaring/auth/server'
import { db, faults, users, provisioning, customers, deals } from '@roaring/db'
import { eq, desc } from 'drizzle-orm'
import { FaultsFilters } from './faults-filters'
import { CreateFaultModal } from './create-fault-modal'

export default async function FaultsPage() {
  const user = await requireUser()

  const [allFaults, allUsers, allProvisioning] = await Promise.all([
    db
      .select({
        id: faults.id,
        title: faults.title,
        type: faults.type,
        status: faults.status,
        ticketRef: faults.ticketRef,
        openedAt: faults.openedAt,
        resolvedAt: faults.resolvedAt,
        assignedTo: faults.assignedTo,
        provisioningId: faults.provisioningId,
        createdAt: faults.createdAt,
      })
      .from(faults)
      .where(eq(faults.tenantId, user.tenantId))
      .orderBy(desc(faults.createdAt)),

    db
      .select({ id: users.id, fullName: users.fullName })
      .from(users)
      .where(eq(users.tenantId, user.tenantId)),

    db
      .select({
        id: provisioning.id,
        accountNumber: customers.accountNumber,
        companyName: customers.companyName,
        firstName: customers.firstName,
        lastName: customers.lastName,
      })
      .from(provisioning)
      .innerJoin(deals, eq(deals.id, provisioning.dealId))
      .innerJoin(customers, eq(customers.id, deals.customerId))
      .where(eq(provisioning.tenantId, user.tenantId)),
  ])

  const userMap = Object.fromEntries(allUsers.map((u) => [u.id, u.fullName]))
  const provMap = Object.fromEntries(
    allProvisioning.map((p) => [
      p.id,
      {
        accountNumber: p.accountNumber,
        name: p.companyName ?? `${p.firstName} ${p.lastName}`,
      },
    ])
  )

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Faults</h1>
          <p className="text-sm text-muted-foreground mt-1">{allFaults.length} faults</p>
        </div>
        <CreateFaultModal users={allUsers} provisioning={allProvisioning} />
      </div>
      <FaultsFilters faults={allFaults} userMap={userMap} provMap={provMap} />
    </div>
  )
}
