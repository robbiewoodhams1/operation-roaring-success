import { requireUser } from '@roaring/auth/server'
import { db, deals, customers, dealPricing } from '@roaring/db'
import { eq } from 'drizzle-orm'
import { cachedQuery } from '@/lib/cached-query'
import { DealsFilters } from './deals-filter'

const getCachedDeals = (tenantId: string) =>
  cachedQuery(
    [`deals-${tenantId}`, `customers-${tenantId}`, `dealPricing-${tenantId}`],
    [`deals-${tenantId}`, `customers-${tenantId}`, `dealPricing-${tenantId}`],
    () =>
      db
        .select({
          id: deals.id,
          dealDate: deals.dealDate,
          status: deals.status,
          dealType: deals.dealType,
          salesAgent: deals.salesAgent,
          closingAgent: deals.closingAgent,
          companyName: customers.companyName,
          firstName: customers.firstName,
          lastName: customers.lastName,
          accountNumber: customers.accountNumber,
          bundlePrice: dealPricing.bundlePrice,
          wholesaleCost: dealPricing.wholesaleCost,
          monthlyGp: dealPricing.monthlyGp,
          contractLength: dealPricing.contractLength,
        })
        .from(deals)
        .leftJoin(customers, eq(deals.customerId, customers.id))
        .leftJoin(dealPricing, eq(deals.id, dealPricing.dealId))
        .where(eq(deals.tenantId, tenantId))
        .orderBy(deals.dealDate)
  )

export default async function DealsPage() {
  const user = await requireUser()

  const allDeals = await getCachedDeals(user.tenantId)

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Deals</h1>
          <p className="text-sm text-muted-foreground mt-1">{allDeals.length} deals</p>
        </div>
      </div>
      <DealsFilters deals={allDeals} />
    </div>
  )
}
