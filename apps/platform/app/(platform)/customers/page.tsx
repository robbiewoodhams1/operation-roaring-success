import { requireUser } from '@roaring/auth/server'
import { db, customers } from '@roaring/db'
import { eq } from 'drizzle-orm'
import { CustomersTable } from './customers-table'

export default async function CustomersPage() {
  const user = await requireUser()

  const allCustomers = await db.query.customers.findMany({
    where: eq(customers.tenantId, user.tenantId),
    orderBy: (customers, { asc }) => [asc(customers.accountNumber)],
  })

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Customers</h1>
          <p className="text-sm text-muted-foreground mt-1">{allCustomers.length} accounts</p>
        </div>
      </div>
      <CustomersTable customers={allCustomers} />
    </div>
  )
}
