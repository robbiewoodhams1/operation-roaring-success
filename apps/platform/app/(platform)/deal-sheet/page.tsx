import { requireUser } from '@roaring/auth/server'
import { db, customers } from '@roaring/db'
import { eq, asc } from 'drizzle-orm'
import { cachedQuery } from '@/lib/cached-query'
import SalesForm from './sales-form'

const getCachedCustomers = (tenantId: string) =>
  cachedQuery([`customers-${tenantId}`], [`customers-${tenantId}`], () =>
    db
      .select()
      .from(customers)
      .where(eq(customers.tenantId, tenantId))
      .orderBy(asc(customers.accountNumber))
  )

// page.tsx
export default async function DealSheetPage() {
  const user = await requireUser()
  const allCustomers = await getCachedCustomers(user.tenantId)

  return (
    <div className="px-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Deal Sheet</h1>
          <p className="text-sm text-muted-foreground mt-1">v1.0.12</p>
        </div>
      </div>
      <SalesForm customers={allCustomers} tenantId={user.tenantId} createdBy={user.id} />
    </div>
  )
}
