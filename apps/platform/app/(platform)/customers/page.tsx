// customers/page.tsx
import { requireUser } from '@roaring/auth/server'
import { db, customers } from '@roaring/db'
import { eq, and, asc, or, ilike, sql } from 'drizzle-orm'
import { CustomersFilters } from './customers-filters'

const PAGE_SIZE = 50

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; type?: string; page?: string }>
}) {
  const user = await requireUser()
  const params = await searchParams

  const page = Number(params.page ?? '1')
  const query = params.q ?? ''
  const statusFilter = params.status ?? ''
  const typeFilter = params.type ?? ''

  const conditions = [eq(customers.tenantId, user.tenantId)]

  if (query.trim()) {
    conditions.push(
      or(
        ilike(customers.accountNumber, `%${query}%`),
        ilike(customers.companyName, `%${query}%`),
        ilike(customers.firstName, `%${query}%`),
        ilike(customers.lastName, `%${query}%`),
        ilike(customers.email, `%${query}%`),
        ilike(customers.postcode, `%${query}%`)
      )!
    )
  }

  if (statusFilter) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    conditions.push(eq(customers.status, statusFilter as any))
  }
  if (typeFilter && typeFilter !== 'all') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    conditions.push(eq(customers.type, typeFilter as any))
  }

  const [rows, countResult] = await Promise.all([
    db
      .select()
      .from(customers)
      .where(and(...conditions))
      .orderBy(asc(customers.accountNumber))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),

    db
      .select({ count: sql<number>`count(*)` })
      .from(customers)
      .where(and(...conditions)),
  ])

  const total = Number(countResult[0]?.count ?? 0)
  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Customers</h1>
          <p className="text-sm text-muted-foreground mt-1">{total} accounts</p>
        </div>
      </div>
      <CustomersFilters customers={rows} total={total} page={page} totalPages={totalPages} />
    </div>
  )
}
