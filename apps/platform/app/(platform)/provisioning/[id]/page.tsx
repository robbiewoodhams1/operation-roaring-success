import { requireUser } from '@roaring/auth/server'
import {
  db,
  provisioning,
  deals,
  customers,
  dealServices,
  provisioningServices,
  auditLogs,
  users,
} from '@roaring/db'
import { eq, asc, and, or, desc, inArray } from 'drizzle-orm'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cachedQuery } from '@/lib/cached-query'
import { ProvisioningEdit } from './provisioning-edit'
import { ProvisioningHistory } from './provisioning-history'
import ProvisioningDetail from './provision-details'
import { ProvisionModal } from './provision-modal'
import { PROV_STATUS_COLOURS, PROV_STATUS_LABELS } from '@/lib/constants'

export default async function ProvisioningDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const user = await requireUser()

  const customerResult = await cachedQuery(
    [`customers-${user.tenantId}`, id],
    [`customers-${user.tenantId}`],
    () => db.select().from(customers).where(eq(customers.accountNumber, id)).limit(1)
  )

  const customer = customerResult[0]
  if (!customer || customer.tenantId !== user.tenantId) notFound()

  const dealResult = await cachedQuery(
    [`deals-${user.tenantId}`, customer.id],
    [`deals-${user.tenantId}`],
    () => db.select().from(deals).where(eq(deals.customerId, customer.id)).limit(1)
  )

  const deal = dealResult[0]
  if (!deal) notFound()

  const provResult = await cachedQuery(
    [`provisioning-${user.tenantId}`, deal.id],
    [`provisioning-${user.tenantId}`],
    () => db.select().from(provisioning).where(eq(provisioning.dealId, deal.id)).limit(1)
  )

  const prov = provResult[0]
  if (!prov) notFound()

  const servicesResult = await cachedQuery(
    [`dealServices-${user.tenantId}`, deal.id],
    [`dealServices-${user.tenantId}`],
    () => db.select().from(dealServices).where(eq(dealServices.dealId, deal.id)).limit(1)
  )

  const services = servicesResult[0] ?? null

  const provServices = await cachedQuery(
    [`provisioningServices-${user.tenantId}`, prov.id],
    [`provisioningServices-${user.tenantId}`],
    () =>
      db
        .select()
        .from(provisioningServices)
        .where(eq(provisioningServices.provisioningId, prov.id))
        .orderBy(asc(provisioningServices.serviceType), asc(provisioningServices.attempt))
  )

  const bbServices = provServices.filter((s) => s.serviceType === 'bb')
  const whcServices = provServices.filter((s) => s.serviceType === 'whc')
  const nfonServices = provServices.filter((s) => s.serviceType === 'nfon')
  const mpfServices = provServices.filter((s) => s.serviceType === 'mpf')

  // Audit history for this provisioning record and all of its service rows.
  const serviceIds = provServices.map((s) => s.id)
  const historyLogs = await db
    .select({
      id: auditLogs.id,
      tableName: auditLogs.tableName,
      recordId: auditLogs.recordId,
      action: auditLogs.action,
      oldData: auditLogs.oldData,
      newData: auditLogs.newData,
      changedBy: auditLogs.changedBy,
      changedAt: auditLogs.changedAt,
    })
    .from(auditLogs)
    .where(
      or(
        and(eq(auditLogs.tableName, 'provisioning'), eq(auditLogs.recordId, prov.id)),
        serviceIds.length > 0
          ? and(
              eq(auditLogs.tableName, 'provisioning_services'),
              inArray(auditLogs.recordId, serviceIds)
            )
          : undefined
      )
    )
    .orderBy(desc(auditLogs.changedAt))

  const historyUserIds = [
    ...new Set(historyLogs.map((l) => l.changedBy).filter(Boolean)),
  ] as string[]
  const historyUserNames: Record<string, string> = {}
  if (historyUserIds.length > 0) {
    const userResults = await cachedQuery(
      [`users-${user.tenantId}`, historyUserIds.join(',')],
      [`users-${user.tenantId}`],
      () =>
        db
          .select({ id: users.id, fullName: users.fullName })
          .from(users)
          .where(inArray(users.id, historyUserIds))
    )
    for (const u of userResults) {
      historyUserNames[u.id] = u.fullName
    }
  }

  const customerName = customer.companyName ?? `${customer.firstName} ${customer.lastName}`

  return (
    <div className="p-6 w-full">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/provisioning">
          <ArrowLeft className="size-4" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <Link href={`/customers/${customer.accountNumber}`}>
              <h1 className="text-2xl font-semibold">{customerName}</h1>
            </Link>
            <Badge variant="outline" className={PROV_STATUS_COLOURS[prov.status]}>
              {PROV_STATUS_LABELS[prov.status]}
            </Badge>
          </div>
          <div className="flex items-center gap-3 mt-1">
            <p className="text-sm font-mono text-muted-foreground">{customer.accountNumber}</p>
            <p className="text-sm text-muted-foreground">
              {deal.dealDate ? new Date(deal.dealDate).toLocaleDateString('en-GB') : '—'}
            </p>
          </div>
        </div>
        <ProvisionModal
          data={{
            accountNumber: customer.accountNumber,
            customerName,
            companyName: customer.companyName,
            title: customer.title,
            firstName: customer.firstName,
            lastName: customer.lastName,
            mobile: customer.mobile,
            landline: customer.landline,
            email: customer.email,
            addressLine1: customer.addressLine1,
            addressLine2: customer.addressLine2,
            addressLine3: customer.addressLine3,
            postcode: customer.postcode,
            broadbandType: services?.broadbandType ?? null,
            ontSerialNumber: services?.ontSerialNumber ?? null,
          }}
        />
      </div>

      <ProvisioningEdit
        prov={prov}
        bbServices={bbServices}
        whcServices={whcServices}
        nfonServices={nfonServices}
        mpfServices={mpfServices}
      />

      <div className="mt-6">
        <ProvisioningHistory logs={historyLogs} userNames={historyUserNames} />
      </div>

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
