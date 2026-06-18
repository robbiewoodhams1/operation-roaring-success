import { requireUser } from '@roaring/auth/server'
import { db, deals, customers, dealServices, dealPricing, dealBilling } from '@roaring/db'
import { eq } from 'drizzle-orm'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft } from 'lucide-react'
import { DealEdit } from './deal-edit'
import { DEAL_STATUS_COLOURS } from '@/lib/constants'

export default async function DealPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await requireUser()

  const customerResult = await db
    .select()
    .from(customers)
    .where(eq(customers.accountNumber, id))
    .limit(1)

  const customer = customerResult[0]
  if (!customer || customer.tenantId !== user.tenantId) notFound()

  const dealResult = await db.select().from(deals).where(eq(deals.customerId, customer.id)).limit(1)

  const deal = dealResult[0]
  if (!deal) notFound()

  const servicesResult = await db
    .select()
    .from(dealServices)
    .where(eq(dealServices.dealId, deal.id))
    .limit(1)

  const services = servicesResult[0] ?? null

  const pricingResult = await db
    .select()
    .from(dealPricing)
    .where(eq(dealPricing.dealId, deal.id))
    .limit(1)

  const pricing = pricingResult[0] ?? null

  const billingResult = await db
    .select()
    .from(dealBilling)
    .where(eq(dealBilling.dealId, deal.id))
    .limit(1)

  const billing = billingResult[0] ?? null

  const customerName = customer.companyName ?? `${customer.firstName} ${customer.lastName}`

  return (
    <div className="p-6 w-full">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/deals">
          <ArrowLeft className="size-4" />
        </Link>
        <div>
          <div className="flex items-center gap-3">
            <Link href={`/customers/${customer.accountNumber}`}>
              <h1 className="text-2xl font-semibold">{customerName}</h1>
            </Link>
            <Badge variant="outline" className={DEAL_STATUS_COLOURS[deal.status]}>
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
