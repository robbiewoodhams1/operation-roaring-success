import { requireUser } from '@roaring/auth/server'
import { db, deals, dealPricing, customers, provisioning, auditLogs, users } from '@roaring/db'
import { eq, gte, desc, and } from 'drizzle-orm'
import { HomeClient } from './home-client'

export default async function HomePage() {
  const user = await requireUser()

  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const todayStr = todayStart.toISOString().split('T')[0] ?? ''
  const monthStartStr = monthStart.toISOString().split('T')[0] ?? ''

  const [dealsAll, provAll, customersAll, auditToday, recentActivity, currentUserResult] =
    await Promise.all([
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

      // All audit log entries for today — tenant-wide source of truth
      db.select().from(auditLogs).where(gte(auditLogs.changedAt, todayStart)),

      db
        .select()
        .from(auditLogs)
        .where(eq(auditLogs.changedBy, user.id))
        .orderBy(desc(auditLogs.changedAt))
        .limit(8),

      db.select({ fullName: users.fullName }).from(users).where(eq(users.id, user.id)).limit(1),
    ])

  const fullName = currentUserResult[0] ? currentUserResult[0].fullName : 'there'

  // ── Sales stats ──────────────────────────────────────────────────────────
  const dealsToday = dealsAll.filter((d) => d.dealDate === todayStr)
  const closesToday = dealsAll.filter((d) => d.dealDate === todayStr && d.closingAgent === fullName)
  const gpToday = dealsToday.reduce((sum, d) => sum + (d.monthlyGp ? Number(d.monthlyGp) : 0), 0)
  const gpMtd = dealsAll.reduce((sum, d) => sum + (d.monthlyGp ? Number(d.monthlyGp) : 0), 0)

  // ── Provisioning stats (audit-log based) ────────────────────────────────
  const provLive = provAll.filter((p) => p.status === 'live').length
  const provPending = provAll.filter((p) => p.status === 'not_started').length

  // Status changes on provisioning_services today = "attempts"
  const statusChangesToday = auditToday.filter((log) => {
    if (log.tableName !== 'provisioning_services') return false
    if (log.action !== 'UPDATE') return false
    const old = log.oldData as any
    const next = log.newData as any
    return old?.status !== next?.status
  })

  const attemptedToday = statusChangesToday.length

  // "Went live today" — status changed TO 'live' today
  const liveToday = statusChangesToday.filter(
    (log) => (log.newData as any)?.status === 'live'
  ).length

  // "Cancelled today" / "Delayed today" — status changed to those values today
  const cancelledToday = statusChangesToday.filter(
    (log) => (log.newData as any)?.status === 'cancelled'
  ).length
  const delayedToday = statusChangesToday.filter(
    (log) => (log.newData as any)?.status === 'delayed'
  ).length

  // Attempt success rate today — of status changes today, % that landed on 'applied' or 'live'
  const attemptRateToday =
    attemptedToday > 0
      ? Math.round(
          (statusChangesToday.filter((log) => {
            const status = (log.newData as any)?.status
            return status === 'applied' || status === 'live'
          }).length /
            attemptedToday) *
            100
        )
      : 0

  const provCancelled = provAll.filter((p) => p.status === 'failed').length

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
    prov_attempted_today: { value: String(attemptedToday) },
    prov_attempt_rate_today: { value: `${attemptRateToday}%` },
    prov_cancelled: { value: String(cancelledToday) },
    prov_delayed: { value: String(delayedToday) },
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
