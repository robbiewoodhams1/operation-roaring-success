import { requireUser } from '@roaring/auth/server'
import { db, provisioning, deals, customers, provisioningServices } from '@roaring/db'
import { eq, asc, or } from 'drizzle-orm'
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
          customerId: provisioning.customerId,
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
        .leftJoin(
          customers,
          or(eq(customers.id, deals.customerId), eq(customers.id, provisioning.customerId))
        )
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
  const allServices = await getCachedProvisioningServices(user.tenantId)

  const serviceMap: Record<
    string,
    {
      bbStatus: string | null
      whcStatus: string | null
      nfonStatus: string | null
      mpfBbStatus: string | null
      mpfVoiceStatus: string | null
      mobileStatus: string | null
    }
  > = {}

  for (const svc of allServices) {
    if (!serviceMap[svc.provisioningId]) {
      serviceMap[svc.provisioningId] = {
        bbStatus: null,
        whcStatus: null,
        nfonStatus: null,
        mpfBbStatus: null,
        mpfVoiceStatus: null,
        mobileStatus: null,
      }
    }
    const entry = serviceMap[svc.provisioningId]!
    if (svc.serviceType === 'bb') entry.bbStatus = svc.status
    if (svc.serviceType === 'whc') entry.whcStatus = svc.status
    if (svc.serviceType === 'nfon') entry.nfonStatus = svc.status
    if (svc.serviceType === 'mpf_broadband') entry.mpfBbStatus = svc.status
    if (svc.serviceType === 'mpf_voice') entry.mpfVoiceStatus = svc.status
    if (svc.serviceType === 'mobile') entry.mobileStatus = svc.status
  }

  const rows = allProvisioning.map((p) => ({
    ...p,
    bbStatus: serviceMap[p.id]?.bbStatus ?? null,
    whcStatus: serviceMap[p.id]?.whcStatus ?? null,
    nfonStatus: serviceMap[p.id]?.nfonStatus ?? null,
    mpfBbStatus: serviceMap[p.id]?.mpfBbStatus ?? null,
    mpfVoiceStatus: serviceMap[p.id]?.mpfVoiceStatus ?? null,
    mobileStatus: serviceMap[p.id]?.mobileStatus ?? null,
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
