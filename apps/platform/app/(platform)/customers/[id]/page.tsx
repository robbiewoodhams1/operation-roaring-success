import { requireUser } from '@roaring/auth/server'
import { db, customers } from '@roaring/db'
import { eq } from 'drizzle-orm'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { cachedQuery } from '@/lib/cached-query'
import { getChangeHistory } from '@/lib/change-history'
import { ChangeHistory } from '@/components/change-history'
import { CustomerEdit } from './edit-customer'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'

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

  const { logs, userNames } = await getChangeHistory([{ table: 'customers', ids: [customer.id] }])

  return (
    <div className="px-6 w-full">
      <div className="w-full flex flex-row justify-between">
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

        <Link href={`/deal-sheet?customerId=${customer.id}`}>
          <Button className="gap-2">
            <Plus className="size-4" />
            Create deal
          </Button>
        </Link>
      </div>

      <CustomerEdit customer={customer} />

      <div className="mt-6">
        <ChangeHistory logs={logs} userNames={userNames} tableLabels={{ customers: 'Customer' }} />
      </div>
    </div>
  )
}
