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
import ProvisioningDetail from './provision-details'

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

  const provResult = await db
    .select()
    .from(provisioning)
    .where(eq(provisioning.dealId, deal.id))
    .limit(1)

  const prov = provResult[0]
  if (!prov) notFound()

  const servicesResult = await db
    .select()
    .from(dealServices)
    .where(eq(dealServices.dealId, deal.id))
    .limit(1)

  const services = servicesResult[0] ?? null

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
        <ProvisioningDetail
          services={
            services
              ? {
                  broadbandType: services.broadbandType,
                  ontSerialNumber: services.ontSerialNumber,
                  normalSpeed: services.normalSpeed,
                  minSpeed: services.minSpeed,
                  maxSpeed: services.maxSpeed,
                  voiceOption: services.voiceOption,
                  callTariff: services.callTariff,
                  equipment: services.equipment as { item: string; qty: number }[] | null,
                }
              : null
          }
          customer={customer}
          deal={{
            salesAgent: deal.salesAgent,
            closingAgent: deal.closingAgent,
            dealType: deal.dealType,
            softFacts: deal.softFacts,
          }}
        />
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
