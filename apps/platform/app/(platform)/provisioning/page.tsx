import { requireUser } from '@roaring/auth/server'
import { db, provisioning, deals, customers } from '@roaring/db'
import { eq } from 'drizzle-orm'
import { ProvisioningTable } from './provisioning-table'

export default async function ProvisioningPage() {
  const user = await requireUser()

  const allProvisioning = await db
    .select({
      id: provisioning.id,
      status: provisioning.status,
      dealId: provisioning.dealId,
      provisioner: provisioning.provisioner,
      proposedLiveDate: provisioning.proposedLiveDate,
      dateOrdered: provisioning.dateOrdered,
      lastCheckedAt: provisioning.lastCheckedAt,
      lastCheckedBy: provisioning.lastCheckedBy,
      installType: provisioning.installType,
      wc1Outcome: provisioning.wc1Outcome,
      wc2Outcome: provisioning.wc2Outcome,
      routerDispatched: provisioning.routerDispatched,
      bbAppliedFor: provisioning.bbAppliedFor,
      accountNumber: customers.accountNumber,
      companyName: customers.companyName,
      firstName: customers.firstName,
      lastName: customers.lastName,
      salesAgent: deals.salesAgent,
      dealDate: deals.dealDate,
    })
    .from(provisioning)
    .leftJoin(deals, eq(provisioning.dealId, deals.id))
    .leftJoin(customers, eq(deals.customerId, customers.id))
    .where(eq(provisioning.tenantId, user.tenantId))
    .orderBy(provisioning.createdAt)

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Provisioning</h1>
          <p className="text-sm text-muted-foreground mt-1">{allProvisioning.length} orders</p>
        </div>
      </div>
      <ProvisioningTable rows={allProvisioning} />
    </div>
  )
}
