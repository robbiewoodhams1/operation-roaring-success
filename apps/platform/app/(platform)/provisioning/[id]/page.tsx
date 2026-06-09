import { requireUser } from '@roaring/auth/server'
import {
  db,
  provisioning,
  deals,
  customers,
  dealServices,
  dealPricing,
  provisioningServices,
} from '@roaring/db'
import { eq, asc } from 'drizzle-orm'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { ProvisioningEdit } from './provisioning-edit'
import CopyButton from '@/components/copy-button'

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

  const provServices = await db
    .select()
    .from(provisioningServices)
    .where(eq(provisioningServices.provisioningId, prov.id))
    .orderBy(asc(provisioningServices.serviceType), asc(provisioningServices.attempt))

  const bbServices = provServices.filter((s) => s.serviceType === 'bb')
  const whcServices = provServices.filter((s) => s.serviceType === 'whc')
  const nfonServices = provServices.filter((s) => s.serviceType === 'nfon')
  const mpfServices = provServices.filter((s) => s.serviceType === 'mpf')

  const customerName = customer.companyName ?? `${customer.firstName} ${customer.lastName}`

  return (
    <div className="p-6 max-w-4xl">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/provisioning">
          <ArrowLeft className="size-4" />
        </Link>
        <div>
          <div className="flex items-center gap-3">
            <Link href={`/customers/${customer.accountNumber}`}>
              <h1 className="text-2xl font-semibold">{customerName}</h1>
            </Link>
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

      <ProvisioningEdit
        prov={prov}
        bbServices={bbServices}
        whcServices={whcServices}
        nfonServices={nfonServices}
        mpfServices={mpfServices}
      />

      <div className="grid grid-cols-1 gap-6 mt-6">
        {services && (
          <Section title="Services (from deal)">
            <Row label="Broadband type" value={services.broadbandType} copyable />
            <Row label="ONT serial" value={services.ontSerialNumber} mono copyable />
            <Row label="Normal speed" value={services.normalSpeed} copyable />
            <Row label="Min speed" value={services.minSpeed} copyable />
            <Row label="Max speed" value={services.maxSpeed} copyable />
            <Row label="Voice option" value={services.voiceOption?.toUpperCase()} copyable />
            <Row label="Call tariff" value={services.callTariff} copyable />
            <Row
              label="Equipment"
              value={
                services.equipment
                  ? (services.equipment as { item: string; qty: number }[])
                      .map((e) => `${e.item} × ${e.qty}`)
                      .join(', ')
                  : null
              }
              copyable
            />
          </Section>
        )}

        <Section title="Customer">
          <Row label="Account number" value={customer.accountNumber} mono copyable />
          <Row label="Company" value={customer.companyName} copyable />
          <Row label="Contact" value={`${customer.firstName} ${customer.lastName}`} copyable />
          <Row label="Mobile" value={customer.mobile} copyable />
          <Row label="Email" value={customer.email} copyable />
          <Row label="Address Line 1" value={customer.addressLine1} copyable />
          <Row label="Address Line 2" value={customer.addressLine2} copyable />
          <Row label="Address Line 3" value={customer.addressLine3} copyable />
          <Row label="Address Line 4" value={customer.addressLine4} copyable />
          <Row label="Postcode" value={customer.postcode} copyable />
        </Section>

        <Section title="Deal">
          <Row label="Sales agent" value={deal.salesAgent} copyable />
          <Row label="Closing agent" value={deal.closingAgent} copyable />
          <Row label="Deal type" value={deal.dealType} copyable />
          <Row label="Soft facts" value={deal.softFacts} copyable />
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
  copyable = false,
}: {
  label: string
  value: string | null | undefined
  mono?: boolean
  copyable?: boolean
}) {
  return (
    <div className="flex px-4 py-3">
      <span className="text-muted-foreground w-40 shrink-0 text-sm">{label}</span>
      <span className={`text-sm flex items-center gap-1 flex-1 ${mono ? 'font-mono' : ''}`}>
        {value ?? '—'}
        {copyable && value && (
          <span className="ml-auto">
            <CopyButton value={value} />
          </span>
        )}
      </span>
    </div>
  )
}
