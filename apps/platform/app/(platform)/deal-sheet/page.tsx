import { requireUser } from '@roaring/auth/server'
import { db, customers } from '@roaring/db'
import { eq } from 'drizzle-orm'
import SalesForm from './sales-form'

export default async function DealSheetPage({
  searchParams,
}: {
  searchParams: Promise<{ customerId?: string }>
}) {
  const user = await requireUser()
  const { customerId } = await searchParams

  const prefilledCustomer = customerId
    ? await db
        .select({
          id: customers.id,
          companyName: customers.companyName,
          accountNumber: customers.accountNumber,
          title: customers.title,
          firstName: customers.firstName,
          lastName: customers.lastName,
          mobile: customers.mobile,
          landline: customers.landline,
          postcode: customers.postcode,
          addressLine1: customers.addressLine1,
          addressLine2: customers.addressLine2,
          addressLine3: customers.addressLine3,
        })
        .from(customers)
        .where(eq(customers.id, customerId))
        .limit(1)
        .then((r) => r[0] ?? null)
    : null

  return (
    <div className="px-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Deal Sheet</h1>
          <p className="text-sm text-muted-foreground mt-1">v1.0.13</p>
        </div>
      </div>
      <SalesForm
        tenantId={user.tenantId}
        createdBy={user.id}
        prefilledCustomer={prefilledCustomer}
      />
    </div>
  )
}
