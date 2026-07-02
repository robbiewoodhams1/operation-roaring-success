import { requireUser } from '@roaring/auth/server'
import { db, provisioning, deals, customers, provisioningServices } from '@roaring/db'
import { eq, asc } from 'drizzle-orm'
import { cachedQuery } from '@/lib/cached-query'
import { ProvisioningFilters } from './provisioning-filters'

const getCachedProvisioning = (tenantId: string) =>
  cachedQuery(
    [`provisioning-${tenantId}`, `deals-${tenantId}`, `customers-${tenantId}`],
    [`provisioning-${tenantId}`, `deals-${tenantId}`, `customers-${tenantId}`],
    () =>
      db
        .select({
          id: provisioning.id,
          status: provisioning.status,
          dealId: provisioning.dealId,
          provisioner: provisioning.provisioner,
          proposedLiveDate: provisioning.proposedLiveDate,
          dateOrdered: provisioning.dateOrdered,
          lastCheckedAt: provisioning.lastCheckedAt,
          lastCheckedBy: provisioning.lastCheckedBy,
          wc1Outcome: provisioning.wc1Outcome,
          wc2Outcome: provisioning.wc2Outcome,
          routerDispatched: provisioning.routerDispatched,
          accountNumber: customers.accountNumber,
          companyName: customers.companyName,
          firstName: customers.firstName,
          lastName: customers.lastName,
          salesAgent: deals.salesAgent,
          dealDate: deals.dealDate,
          customerType: customers.type,
        })
        .from(provisioning)
        .leftJoin(deals, eq(provisioning.dealId, deals.id))
        .leftJoin(customers, eq(deals.customerId, customers.id))
        .where(eq(provisioning.tenantId, tenantId))
        .orderBy(provisioning.createdAt)
  )

const getCachedProvisioningServices = (tenantId: string) =>
  cachedQuery([`provisioningServices-${tenantId}`], [`provisioningServices-${tenantId}`], () =>
    db.select().from(provisioningServices).orderBy(asc(provisioningServices.attempt))
  )

export default async function ProvisioningPage() {
  const user = await requireUser()

  const allProvisioning = await getCachedProvisioning(user.tenantId)

  // Fetch latest service statuses for each provisioning record
  const allServices = await getCachedProvisioningServices(user.tenantId)

  // Map provisioning id → latest bb/whc status
  const serviceMap: Record<
    string,
    {
      bbStatus: string | null
      whcStatus: string | null
      nfonStatus: string | null
      mpfStatus: string | null
    }
  > = {}
  for (const svc of allServices) {
    if (!serviceMap[svc.provisioningId]) {
      serviceMap[svc.provisioningId] = {
        bbStatus: null,
        whcStatus: null,
        nfonStatus: null,
        mpfStatus: null,
      }
    }
    const entry = serviceMap[svc.provisioningId]!
    if (svc.serviceType === 'bb') entry.bbStatus = svc.status
    if (svc.serviceType === 'whc') entry.whcStatus = svc.status
    if (svc.serviceType === 'nfon') entry.nfonStatus = svc.status
    if (svc.serviceType === 'mpf') entry.mpfStatus = svc.status
  }

  const rows = allProvisioning.map((p) => ({
    ...p,
    bbStatus: serviceMap[p.id]?.bbStatus ?? null,
    whcStatus: serviceMap[p.id]?.whcStatus ?? null,
    nfonStatus: serviceMap[p.id]?.nfonStatus ?? null,
    mpfStatus: serviceMap[p.id]?.mpfStatus ?? null,
    customerType: p.customerType,
  }))

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Provisioning</h1>
          <p className="text-sm text-muted-foreground mt-1">{rows.length} orders</p>
        </div>
      </div>
      <ProvisioningFilters rows={rows} />
    </div>
  )
}
