import { requireUser } from '@roaring/auth/server'
import { db, deals, customers, dealServices, dealPricing, dealBilling } from '@roaring/db'
import { eq } from 'drizzle-orm'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft } from 'lucide-react'
import { cachedQuery } from '@/lib/cached-query'
import { getChangeHistory } from '@/lib/change-history'
import { ChangeHistory } from '@/components/change-history'
import { DealEdit } from './deal-edit'
import { DEAL_STATUS_COLOURS } from '@/lib/constants'

const getCachedCustomer = (tenantId: string, id: string) =>
  cachedQuery([`customers-${tenantId}`, id], [`customers-${tenantId}`], () =>
    db.select().from(customers).where(eq(customers.accountNumber, id)).limit(1)
  )

const getCachedDeal = (tenantId: string, customerId: string) =>
  cachedQuery([`deals-${tenantId}`, customerId], [`deals-${tenantId}`], () =>
    db.select().from(deals).where(eq(deals.customerId, customerId)).limit(1)
  )

const getCachedDealServices = (tenantId: string, dealId: string) =>
  cachedQuery([`dealServices-${tenantId}`, dealId], [`dealServices-${tenantId}`], () =>
    db.select().from(dealServices).where(eq(dealServices.dealId, dealId)).limit(1)
  )

const getCachedDealPricing = (tenantId: string, dealId: string) =>
  cachedQuery([`dealPricing-${tenantId}`, dealId], [`dealPricing-${tenantId}`], () =>
    db.select().from(dealPricing).where(eq(dealPricing.dealId, dealId)).limit(1)
  )

const getCachedDealBilling = (tenantId: string, dealId: string) =>
  cachedQuery([`dealBilling-${tenantId}`, dealId], [`dealBilling-${tenantId}`], () =>
    db.select().from(dealBilling).where(eq(dealBilling.dealId, dealId)).limit(1)
  )

export default async function DealPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await requireUser()

  const customerResult = await getCachedCustomer(user.tenantId, id)

  const customer = customerResult[0]
  if (!customer || customer.tenantId !== user.tenantId) notFound()

  const dealResult = await getCachedDeal(user.tenantId, customer.id)

  const deal = dealResult[0]
  if (!deal) notFound()

  const servicesResult = await getCachedDealServices(user.tenantId, deal.id)

  const services = servicesResult[0] ?? null

  const pricingResult = await getCachedDealPricing(user.tenantId, deal.id)

  const pricing = pricingResult[0] ?? null

  const billingResult = await getCachedDealBilling(user.tenantId, deal.id)

  const billing = billingResult[0] ?? null

  const customerName = customer.companyName ?? `${customer.firstName} ${customer.lastName}`

  const { logs, userNames } = await getChangeHistory([
    { table: 'deals', ids: [deal.id] },
    { table: 'deal_services', parentField: 'deal_id', parentId: deal.id },
    { table: 'deal_pricing', parentField: 'deal_id', parentId: deal.id },
    { table: 'deal_billing', parentField: 'deal_id', parentId: deal.id },
  ])

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

      <div className="mt-6">
        <ChangeHistory
          logs={logs}
          userNames={userNames}
          tableLabels={{
            deals: 'Deal',
            deal_services: 'Services',
            deal_pricing: 'Pricing',
            deal_billing: 'Billing',
          }}
        />
      </div>
    </div>
  )
}
