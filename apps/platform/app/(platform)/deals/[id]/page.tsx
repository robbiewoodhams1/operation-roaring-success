import { requireUser } from '@roaring/auth/server'
import { db, deals, customers, dealServices, dealPricing, dealBilling } from '@roaring/db'
import { eq } from 'drizzle-orm'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft } from 'lucide-react'
import { DealEdit } from './deal-edit'

const statusColours: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  live: 'bg-green-100 text-green-800 border-green-200',
  cancelled: 'bg-red-100 text-red-800 border-red-200',
}

export default async function DealPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await requireUser()

  const customer = await db.query.customers.findFirst({
    where: eq(customers.accountNumber, id),
  })

  if (!customer || customer.tenantId !== user.tenantId) notFound()

  const deal = await db.query.deals.findFirst({
    where: eq(deals.customerId, customer.id),
  })

  if (!deal) notFound()

  const services = await db.query.dealServices.findFirst({
    where: eq(dealServices.dealId, deal.id),
  })

  const pricing = await db.query.dealPricing.findFirst({
    where: eq(dealPricing.dealId, deal.id),
  })

  const billing = await db.query.dealBilling.findFirst({
    where: eq(dealBilling.dealId, deal.id),
  })

  const customerName = customer.companyName ?? `${customer.firstName} ${customer.lastName}`

  return (
    <div className="p-6 max-w-4xl">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/deals">
          <ArrowLeft className="size-4" />
        </Link>
        <div>
          <div className="flex items-center gap-3">
            <Link href={`/customers/${customer.accountNumber}`}>
              <h1 className="text-2xl font-semibold">{customerName}</h1>
            </Link>
            <Badge variant="outline" className={statusColours[deal.status]}>
              {deal.status}
            </Badge>
          </div>
          <div className="flex items-center gap-3 mt-1">
            <p className="text-sm font-mono text-muted-foreground">{customer.accountNumber}</p>
            <p className="text-sm text-muted-foreground">
              {new Date(deal.dealDate).toLocaleDateString('en-GB')}
            </p>
          </div>
        </div>
      </div>

      <DealEdit
        deal={deal}
        services={services ?? null}
        pricing={pricing ?? null}
        billing={billing ?? null}
        customer={customer}
      />
    </div>
  )
}
