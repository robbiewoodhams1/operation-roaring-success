import { requireUser } from '@roaring/auth/server'
import { db, customers } from '@roaring/db'
import { eq, asc } from 'drizzle-orm'
import { cachedQuery } from '@/lib/cached-query'
import { CustomersFilters } from './customers-filters'

const getCachedCustomers = (tenantId: string) =>
  cachedQuery([`customers-${tenantId}`], [`customers-${tenantId}`], () =>
    db
      .select()
      .from(customers)
      .where(eq(customers.tenantId, tenantId))
      .orderBy(asc(customers.accountNumber))
  )

export default async function CustomersPage() {
  const user = await requireUser()

  const allCustomers = await getCachedCustomers(user.tenantId)

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Customers</h1>
          <p className="text-sm text-muted-foreground mt-1">{allCustomers.length} accounts</p>
        </div>
      </div>
      <CustomersFilters customers={allCustomers} />
    </div>
  )
}
