import { requireUser } from '@roaring/auth/server'
import {
  db,
  deals,
  dealPricing,
  customers,
  provisioning,
  provisioningServices,
  auditLogs,
  users,
} from '@roaring/db'
import { eq, gte, desc, and, or } from 'drizzle-orm'
import { HomeClient } from './home-client'

// Format a Date as YYYY-MM-DD in *local* time. toISOString() converts to UTC,
// which shifts local midnight to the previous day during BST.
function localDateString(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export default async function HomePage() {
  const user = await requireUser()

  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const todayStr = localDateString(now)
  const monthStartStr = localDateString(new Date(now.getFullYear(), now.getMonth(), 1))

  const [
    dealsAll,
    provAll,
    customersAll,
    serviceAuditToday,
    recentActivity,
    currentUserResult,
    servicesToday,
    routersOrderedToday,
  ] = await Promise.all([
    db
      .select({
        id: deals.id,
        dealDate: deals.dealDate,
        salesAgent: deals.salesAgent,
        closingAgent: deals.closingAgent,
        monthlyGp: dealPricing.monthlyGp,
      })
      .from(deals)
      .leftJoin(dealPricing, eq(dealPricing.dealId, deals.id))
      .where(and(eq(deals.tenantId, user.tenantId), gte(deals.dealDate, monthStartStr))),

    db
      .select({ id: provisioning.id, status: provisioning.status })
      .from(provisioning)
      .where(eq(provisioning.tenantId, user.tenantId)),

    db
      .select({ id: customers.id, status: customers.status })
      .from(customers)
      .where(eq(customers.tenantId, user.tenantId)),

    // Service status changes recorded today, scoped to this tenant via the
    // provisioning join (audit_logs itself has no tenant column).
    db
      .select({
        recordId: auditLogs.recordId,
        action: auditLogs.action,
        oldData: auditLogs.oldData,
        newData: auditLogs.newData,
        serviceType: provisioningServices.serviceType,
      })
      .from(auditLogs)
      .innerJoin(provisioningServices, eq(provisioningServices.id, auditLogs.recordId))
      .innerJoin(provisioning, eq(provisioning.id, provisioningServices.provisioningId))
      .where(
        and(
          eq(auditLogs.tableName, 'provisioning_services'),
          eq(provisioning.tenantId, user.tenantId),
          gte(auditLogs.changedAt, todayStart)
        )
      ),

    db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.changedBy, user.id))
      .orderBy(desc(auditLogs.changedAt))
      .limit(8),

    db.select({ fullName: users.fullName }).from(users).where(eq(users.id, user.id)).limit(1),

    // Services with any of their milestone dates set to today.
    db
      .select({
        id: provisioningServices.id,
        serviceType: provisioningServices.serviceType,
        dateOrdered: provisioningServices.dateOrdered,
        liveDate: provisioningServices.liveDate,
        cancelledDate: provisioningServices.cancelledDate,
        delayedDate: provisioningServices.delayedDate,
      })
      .from(provisioningServices)
      .innerJoin(provisioning, eq(provisioning.id, provisioningServices.provisioningId))
      .where(
        and(
          eq(provisioning.tenantId, user.tenantId),
          or(
            eq(provisioningServices.dateOrdered, todayStr),
            eq(provisioningServices.liveDate, todayStr),
            eq(provisioningServices.cancelledDate, todayStr),
            eq(provisioningServices.delayedDate, todayStr)
          )
        )
      ),

    db
      .select({ routerOrderedDate: provisioning.routerOrderedDate })
      .from(provisioning)
      .where(
        and(eq(provisioning.tenantId, user.tenantId), eq(provisioning.routerOrderedDate, todayStr))
      ),
  ])

  const fullName = currentUserResult[0] ? currentUserResult[0].fullName : 'there'

  // ── Sales stats ──────────────────────────────────────────────────────────
  const dealsToday = dealsAll.filter((d) => d.dealDate === todayStr)
  const closesToday = dealsAll.filter((d) => d.dealDate === todayStr && d.closingAgent === fullName)
  const gpToday = dealsToday.reduce((sum, d) => sum + (d.monthlyGp ? Number(d.monthlyGp) : 0), 0)
  const gpMtd = dealsAll.reduce((sum, d) => sum + (d.monthlyGp ? Number(d.monthlyGp) : 0), 0)

  // ── Provisioning stats ───────────────────────────────────────────────────
  const provLive = provAll.filter((p) => p.status === 'live').length
  const provPending = provAll.filter((p) => p.status === 'not_started').length

  // Services whose status was changed to `status` today, deduped per service.
  function serviceIdsChangedTo(status: string, serviceType?: string): Set<string> {
    const ids = new Set<string>()
    for (const log of serviceAuditToday) {
      if (log.action !== 'UPDATE') continue
      const oldStatus = (log.oldData as { status?: string } | null)?.status
      const newStatus = (log.newData as { status?: string } | null)?.status
      if (newStatus !== status || oldStatus === newStatus) continue
      if (serviceType && log.serviceType !== serviceType) continue
      ids.add(log.recordId)
    }
    return ids
  }

  // A service counts for a "today" stat if its status was changed today OR the
  // matching milestone date field is set to today — whichever was recorded.
  function countToday(changed: Set<string>, alsoIds: string[]): number {
    const ids = new Set(changed)
    for (const id of alsoIds) ids.add(id)
    return ids.size
  }

  const liveToday = countToday(
    serviceIdsChangedTo('live'),
    servicesToday.filter((s) => s.liveDate === todayStr).map((s) => s.id)
  )
  const cancelledToday = countToday(
    serviceIdsChangedTo('cancelled'),
    servicesToday.filter((s) => s.cancelledDate === todayStr).map((s) => s.id)
  )
  const delayedToday = countToday(
    serviceIdsChangedTo('delayed'),
    servicesToday.filter((s) => s.delayedDate === todayStr).map((s) => s.id)
  )

  // ── Services applied today ───────────────────────────────────────────────
  function appliedToday(
    serviceType: 'bb' | 'whc' | 'mpf_broadband' | 'mpf_voice' | 'nfon'
  ): number {
    return countToday(
      serviceIdsChangedTo('applied', serviceType),
      servicesToday
        .filter((s) => s.serviceType === serviceType && s.dateOrdered === todayStr)
        .map((s) => s.id)
    )
  }

  const routerCount = routersOrderedToday.length

  // ── Customer stats ───────────────────────────────────────────────────────
  const activeCustomers = customersAll.filter((c) => c.status === 'active').length

  const statValues: Record<string, { value: string; sub?: string }> = {
    deals_today: { value: String(dealsToday.length) },
    closes_today: { value: String(closesToday.length) },
    gp_today: { value: `£${gpToday.toFixed(2)}` },
    deals_mtd: { value: String(dealsAll.length) },
    gp_mtd: { value: `£${gpMtd.toFixed(2)}` },
    prov_total: { value: String(provAll.length) },
    prov_live: { value: String(provLive) },
    prov_live_today: { value: String(liveToday) },
    prov_pending: { value: String(provPending) },
    prov_cancelled: { value: String(cancelledToday) },
    prov_delayed: { value: String(delayedToday) },
    bb_ordered_today: { value: String(appliedToday('bb')) },
    whc_ordered_today: { value: String(appliedToday('whc')) },
    mpf_broadband_ordered_today: { value: String(appliedToday('mpf_broadband')) },
    mpf_voice_ordered_today: { value: String(appliedToday('mpf_voice')) },
    nfon_ordered_today: { value: String(appliedToday('nfon')) },
    routers_ordered_today: { value: String(routerCount) },
    active_customers: { value: String(activeCustomers) },
    customers_total: { value: String(customersAll.length) },
  }

  return (
    <HomeClient
      fullName={fullName}
      statValues={statValues}
      recentActivity={recentActivity}
      userId={user.id}
    />
  )
}
