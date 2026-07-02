import { requireUser } from '@roaring/auth/server'
import { db, transferCeases, users, provisioning, customers, deals } from '@roaring/db'
import { eq, desc } from 'drizzle-orm'
import { cachedQuery } from '@/lib/cached-query'
import { TransferCeasesFilters } from './transfers-filters'
import { CreateModal } from './create-modal'

const getCachedTransferCeases = (tenantId: string) =>
  cachedQuery([`transferCeases-${tenantId}`], [`transferCeases-${tenantId}`], () =>
    db
      .select({
        id: transferCeases.id,
        type: transferCeases.type,
        status: transferCeases.status,
        openedAt: transferCeases.openedAt,
        completedAt: transferCeases.completedAt,
        assignedTo: transferCeases.assignedTo,
        provisioningId: transferCeases.provisioningId,
        createdAt: transferCeases.createdAt,
      })
      .from(transferCeases)
      .where(eq(transferCeases.tenantId, tenantId))
      .orderBy(desc(transferCeases.createdAt))
  )

const getCachedUsers = (tenantId: string) =>
  cachedQuery([`users-${tenantId}`], [`users-${tenantId}`], () =>
    db
      .select({ id: users.id, fullName: users.fullName })
      .from(users)
      .where(eq(users.tenantId, tenantId))
  )

const getCachedProvisioning = (tenantId: string) =>
  cachedQuery(
    [`provisioning-${tenantId}`],
    [`provisioning-${tenantId}`, `customers-${tenantId}`, `deals-${tenantId}`],
    () =>
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
        .where(eq(provisioning.tenantId, tenantId))
  )

export default async function TransferCeasesPage() {
  const user = await requireUser()

  const [allRecords, allUsers, allProvisioning] = await Promise.all([
    getCachedTransferCeases(user.tenantId),
    getCachedUsers(user.tenantId),
    getCachedProvisioning(user.tenantId),
  ])

  const userMap = Object.fromEntries(allUsers.map((u) => [u.id, u.fullName]))
  const provMap = Object.fromEntries(
    allProvisioning.map((p) => [
      p.id,
      { accountNumber: p.accountNumber, name: p.companyName ?? `${p.firstName} ${p.lastName}` },
    ])
  )

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Transfers & Ceases</h1>
          <p className="text-sm text-muted-foreground mt-1">{allRecords.length} records</p>
        </div>
        <CreateModal
          users={allUsers}
          provisioning={allProvisioning.map((p) => ({ id: p.id, accountNumber: p.accountNumber }))}
        />
      </div>
      <TransferCeasesFilters records={allRecords} userMap={userMap} provMap={provMap} />
    </div>
  )
}
