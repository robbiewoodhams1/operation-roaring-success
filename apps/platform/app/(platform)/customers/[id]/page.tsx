import { requireUser } from '@roaring/auth/server'
import { db, customers } from '@roaring/db'
import { eq } from 'drizzle-orm'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { cachedQuery } from '@/lib/cached-query'
import { CustomerEdit } from './edit-customer'

const getCachedCustomer = (tenantId: string, id: string) =>
  cachedQuery([`customers-${tenantId}`, id], [`customers-${tenantId}`], () =>
    db.select().from(customers).where(eq(customers.accountNumber, id)).limit(1)
  )

export default async function CustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await requireUser()

  const result = await getCachedCustomer(user.tenantId, id)

  const customer = result[0]
  if (!customer || customer.tenantId !== user.tenantId) notFound()

  return (
    <div className="px-6 w-full">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/customers">
          <ArrowLeft className="size-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold">
            {customer.companyName ?? `${customer.firstName} ${customer.lastName}`}
          </h1>
          <p className="text-sm font-mono text-muted-foreground">{customer.accountNumber}</p>
        </div>
      </div>
      <CustomerEdit customer={customer} />
    </div>
  )
}
