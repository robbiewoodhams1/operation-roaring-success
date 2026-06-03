import { requireUser } from '@roaring/auth/server'
import { db, deals, customers, dealServices, dealPricing, dealBilling } from '@roaring/db'
import { eq } from 'drizzle-orm'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft } from 'lucide-react'

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

  // Then get the deal by customer ID
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

  const customerName = customer?.companyName ?? `${customer?.firstName} ${customer?.lastName}`

  return (
    <div className="p-6 max-w-4xl">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/deals">
          <ArrowLeft className="size-4" />
        </Link>
        <div>
          <div className="flex items-center gap-3">
            <Link href={`/customers/${customer?.accountNumber}`}>
              <h1 className="text-2xl font-semibold hover:scale-102">{customerName}</h1>
            </Link>
            <Badge variant="outline" className={statusColours[deal.status]}>
              {deal.status}
            </Badge>
          </div>
          <div className="flex items-center gap-3 mt-1">
            <p className="text-sm font-mono text-muted-foreground">{customer?.accountNumber}</p>
            <p className="text-sm text-muted-foreground">
              {new Date(deal.dealDate).toLocaleDateString('en-GB')}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Deal */}
        <Section title="Deal">
          <Row label="Sales agent" value={deal.salesAgent} />
          <Row label="Closing agent" value={deal.closingAgent} />
          <Row label="Deal type" value={deal.dealType} />
          <Row label="Welcome call" value={deal.welcomeCall?.toUpperCase()} />
          <Row label="Trading address" value={deal.tradingAddress} />
          <Row label="Soft facts" value={deal.softFacts} />
        </Section>

        {/* Services */}
        {services && (
          <Section title="Services">
            <Row label="Line checked" value={services.lineChecked ? 'Yes' : 'No'} />
            <Row label="Broadband type" value={services.broadbandType} />
            <Row label="Install type" value={services.installType?.replace('_', ' ')} />
            <Row label="ONT serial" value={services.ontSerialNumber} mono />
            <Row label="Normal speed" value={services.normalSpeed} />
            <Row label="Min speed" value={services.minSpeed} />
            <Row label="Max speed" value={services.maxSpeed} />
            <Row label="Voice required" value={services.voiceRequired ? 'Yes' : 'No'} />
            <Row label="Current voice type" value={services.currentVoiceType} />
            <Row label="Line configuration" value={services.lineConfiguration} />
            <Row label="Num licenses" value={services.numLicenses?.toString()} />
            <Row label="Voice option" value={services.voiceOption?.toUpperCase()} />
            <Row label="Call tariff" value={services.callTariff} />
            <Row label="Existing handsets" value={services.existingHandsets} />
            <Row label="Intl package" value={services.intlPackage} />
            <Row label="Intl location" value={services.intlLocation} />
            <Row label="Premium package" value={services.premiumPackage} />
            <Row
              label="Equipment"
              value={
                services.equipment
                  ? (services.equipment as { item: string; qty: number }[])
                      .map((e) => `${e.item} × ${e.qty}`)
                      .join(', ')
                  : null
              }
            />
          </Section>
        )}

        {/* Pricing */}
        {pricing && (
          <Section title="Pricing">
            <Row label="Bundle price" value={`£${Number(pricing.bundlePrice).toFixed(2)}`} mono />
            <Row
              label="Wholesale cost"
              value={`£${Number(pricing.wholesaleCost).toFixed(2)}`}
              mono
            />
            <Row label="Monthly GP" value={`£${Number(pricing.monthlyGp).toFixed(2)}`} mono />
            <Row
              label="Connection fee"
              value={pricing.connectionFee ? `£${Number(pricing.connectionFee).toFixed(2)}` : null}
              mono
            />
            <Row
              label="Bill losing supplier"
              value={
                pricing.billAmountLosingSupplier
                  ? `£${Number(pricing.billAmountLosingSupplier).toFixed(2)}`
                  : null
              }
              mono
            />
            <Row label="Contract length" value={pricing.contractLength?.replace('_', ' ')} />
          </Section>
        )}

        {/* Billing */}
        {billing && (
          <Section title="Billing">
            <Row label="Billing type" value={billing.billingType} />
            <Row label="Payment method" value={billing.paymentMethod?.replace('_', ' ')} />
            <Row label="Phone provider" value={billing.phoneProvider} />
            <Row label="Broadband provider" value={billing.broadbandProvider} />
            <Row label="Invoice name" value={billing.invoiceName} />
            <Row label="Bank branch" value={billing.bankBranch} />
            <Row label="Sort code" value={billing.sortCode} mono />
            <Row label="Account number" value={billing.accountNumber} mono />
            <Row label="Bank checked" value={billing.bankChecked ? 'Yes' : 'No'} />
          </Section>
        )}

        <Section title="Customer">
          <Row label="Account number" value={customer.accountNumber} mono />
          <Row label="Type" value={customer.type} />
          <Row label="Status" value={customer.status.replace('_', ' ')} />
          <Row label="Company" value={customer.companyName} />
          <Row label="First name" value={customer.firstName} />
          <Row label="Last name" value={customer.lastName} />
          <Row label="Mobile" value={customer.mobile} />
          <Row label="Email" value={customer.email} />
          <Row label="Address line 1" value={customer.addressLine1} />
          <Row label="Address line 2" value={customer.addressLine2} />
          <Row label="Address line 3" value={customer.addressLine3} />
          <Row label="Address line 4" value={customer.addressLine4} />
          <Row label="Postcode" value={customer.postcode} mono />
          <Row label="Created" value={new Date(customer.createdAt).toLocaleDateString('en-GB')} />
        </Section>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b bg-muted/30">
        <h2 className="text-sm font-medium">{title}</h2>
      </div>
      <div className="divide-y">{children}</div>
    </section>
  )
}

function Row({
  label,
  value,
  mono = false,
}: {
  label: string
  value: string | null | undefined
  mono?: boolean
}) {
  return (
    <div className="flex px-4 py-3">
      <span className="text-muted-foreground w-40 shrink-0 text-sm">{label}</span>
      <span className={`text-sm ${mono ? 'font-mono' : ''}`}>{value ?? '—'}</span>
    </div>
  )
}
