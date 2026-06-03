import { requireUser } from '@roaring/auth/server'
import { db, provisioning, deals, customers, dealServices, dealPricing } from '@roaring/db'
import { eq } from 'drizzle-orm'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

const statusColours: Record<string, string> = {
  not_started: 'bg-gray-100 text-gray-700 border-gray-200',
  broadband_applied: 'bg-blue-100 text-blue-800 border-blue-200',
  whc_applied: 'bg-purple-100 text-purple-800 border-purple-200',
  broadband_and_whc_applied: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  live: 'bg-green-100 text-green-800 border-green-200',
  failed: 'bg-red-100 text-red-800 border-red-200',
}

const statusLabels: Record<string, string> = {
  not_started: 'Not started',
  broadband_applied: 'BB applied',
  whc_applied: 'WHC applied',
  broadband_and_whc_applied: 'BB & WHC applied',
  live: 'Live',
  failed: 'Failed',
}

const wcColours: Record<string, string> = {
  answered: 'bg-green-100 text-green-800 border-green-200',
  call_back: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  no_answer: 'bg-gray-100 text-gray-700 border-gray-200',
  cancelled: 'bg-red-100 text-red-800 border-red-200',
}

export default async function ProvisioningDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
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

  const prov = await db.query.provisioning.findFirst({
    where: eq(provisioning.dealId, deal.id),
  })

  if (!prov) notFound()

  const services = await db.query.dealServices.findFirst({
    where: eq(dealServices.dealId, deal.id),
  })

  const pricing = await db.query.dealPricing.findFirst({
    where: eq(dealPricing.dealId, deal.id),
  })

  const customerName = customer.companyName ?? `${customer.firstName} ${customer.lastName}`

  return (
    <div className="p-6 max-w-4xl">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/provisioning">
          <ArrowLeft className="size-4" />
        </Link>
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold">{customerName}</h1>
            <Badge variant="outline" className={statusColours[prov.status]}>
              {statusLabels[prov.status]}
            </Badge>
          </div>
          <div className="flex items-center gap-3 mt-1">
            <p className="text-sm font-mono text-muted-foreground">{customer.accountNumber}</p>
            <p className="text-sm text-muted-foreground">
              {deal.dealDate ? new Date(deal.dealDate).toLocaleDateString('en-GB') : '—'}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <Section title="Welcome Calls">
          <Row label="WC1 outcome">
            {prov.wc1Outcome ? (
              <Badge variant="outline" className={wcColours[prov.wc1Outcome]}>
                {prov.wc1Outcome.replace('_', ' ')}
              </Badge>
            ) : (
              '—'
            )}
          </Row>
          <Row label="WC1 comments" value={prov.wc1Comments} />
          <Row label="WC2 outcome">
            {prov.wc2Outcome ? (
              <Badge variant="outline" className={wcColours[prov.wc2Outcome]}>
                {prov.wc2Outcome.replace('_', ' ')}
              </Badge>
            ) : (
              '—'
            )}
          </Row>
          <Row label="WC2 comments" value={prov.wc2Comments} />
        </Section>

        <Section title="Order">
          <Row label="Status">
            <Badge variant="outline" className={statusColours[prov.status]}>
              {statusLabels[prov.status]}
            </Badge>
          </Row>
          <Row label="Install type" value={prov.installType?.replace('_', ' ')} />
          <Row label="BB applied for" value={prov.bbAppliedFor} />
          <Row label="BB order ref" value={prov.bbOrderRef} mono />
          <Row label="WHC reference" value={prov.whcReference} mono />
          <Row
            label="Date ordered"
            value={prov.dateOrdered ? new Date(prov.dateOrdered).toLocaleDateString('en-GB') : null}
          />
          <Row
            label="Proposed live date"
            value={
              prov.proposedLiveDate
                ? new Date(prov.proposedLiveDate).toLocaleDateString('en-GB')
                : null
            }
          />
          <Row label="Order fault ref" value={prov.orderFaultRef} mono />
          <Row label="Order comments" value={prov.orderComments} />
          <Row label="Provisioner" value={prov.provisioner} />
          <Row label="Last checked">
            {prov.lastCheckedAt
              ? `${new Date(prov.lastCheckedAt).toLocaleDateString('en-GB')}${prov.lastCheckedBy ? ` · ${prov.lastCheckedBy}` : ''}`
              : '—'}
          </Row>
        </Section>

        <Section title="Router">
          <Row label="Dispatched" value={prov.routerDispatched ? 'Yes' : 'No'} />
          <Row label="Dispatch ref" value={prov.routerDispatchRef} mono />
          <Row label="Tracking number" value={prov.routerTrackingNumber} mono />
        </Section>

        {services && (
          <Section title="Services (from deal)">
            <Row label="Broadband type" value={services.broadbandType} />
            <Row label="Install type (deal)" value={services.installType?.replace('_', ' ')} />
            <Row label="ONT serial" value={services.ontSerialNumber} mono />
            <Row label="Normal speed" value={services.normalSpeed} />
            <Row label="Min speed" value={services.minSpeed} />
            <Row label="Max speed" value={services.maxSpeed} />
            <Row label="Voice option" value={services.voiceOption?.toUpperCase()} />
            <Row label="Call tariff" value={services.callTariff} />
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

        {pricing && (
          <Section title="Pricing (from deal)">
            <Row label="Bundle price" value={`£${Number(pricing.bundlePrice).toFixed(2)}`} mono />
            <Row
              label="Wholesale cost"
              value={`£${Number(pricing.wholesaleCost).toFixed(2)}`}
              mono
            />
            <Row label="Monthly GP" value={`£${Number(pricing.monthlyGp).toFixed(2)}`} mono />
            <Row label="Contract length" value={pricing.contractLength?.replace('_', ' ')} />
          </Section>
        )}

        <Section title="Customer">
          <Row label="Account number" value={customer.accountNumber} mono />
          <Row label="Company" value={customer.companyName} />
          <Row label="Contact" value={`${customer.firstName} ${customer.lastName}`} />
          <Row label="Mobile" value={customer.mobile} />
          <Row label="Email" value={customer.email} />
          <Row
            label="Address"
            value={[
              customer.addressLine1,
              customer.addressLine2,
              customer.addressLine3,
              customer.addressLine4,
              customer.postcode,
            ]
              .filter(Boolean)
              .join(', ')}
          />
        </Section>

        <Section title="Deal">
          <Row label="Sales agent" value={deal.salesAgent} />
          <Row label="Closing agent" value={deal.closingAgent} />
          <Row label="Deal type" value={deal.dealType} />
          <Row label="Deal date" value={new Date(deal.dealDate).toLocaleDateString('en-GB')} />
          <Row label="Soft facts" value={deal.softFacts} />
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
  children,
}: {
  label: string
  value?: string | null
  mono?: boolean
  children?: React.ReactNode
}) {
  return (
    <div className="flex px-4 py-3 items-center">
      <span className="text-muted-foreground w-40 shrink-0 text-sm">{label}</span>
      {children ? (
        <div className="text-sm">{children}</div>
      ) : (
        <span className={`text-sm ${mono ? 'font-mono' : ''}`}>{value ?? '—'}</span>
      )}
    </div>
  )
}
