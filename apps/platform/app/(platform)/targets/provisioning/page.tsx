import { requireUser } from '@roaring/auth/server'
import { db, deals, provisioning, provisioningServices, users } from '@roaring/db'
import { gte, lt, and, eq, inArray } from 'drizzle-orm'
import { TargetsClient } from './targets-client'

function empty() {
  return { total: 0, attempted: 0, live: 0, pct: 0 }
}

export default async function TargetsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; year?: string }>
}) {
  const user = await requireUser()
  const { month, year } = await searchParams

  const now = new Date()
  const targetMonth =
    month !== undefined && month !== '' && !isNaN(parseInt(month))
      ? parseInt(month)
      : now.getMonth()
  const targetYear =
    year !== undefined && year !== '' && !isNaN(parseInt(year)) ? parseInt(year) : now.getFullYear()

  const monthStart = new Date(targetYear, targetMonth, 1)
  const monthEnd = new Date(targetYear, targetMonth + 1, 1)
  const monthStartDate = monthStart.toISOString().split('T')[0] as string
  const monthEndDate = monthEnd.toISOString().split('T')[0] as string
  const monthLabel = monthStart.toLocaleString('en-GB', { month: 'long', year: 'numeric' })
  const isCurrentMonth = targetMonth === now.getMonth() && targetYear === now.getFullYear()

  const currentUserResult = await db
    .select({ name: users.fullName })
    .from(users)
    .where(eq(users.id, user.id))
    .limit(1)

  const userFullName = currentUserResult[0] ? currentUserResult[0].name : 'User'

  async function getStats(dealFilter: 'team' | 'individual') {
    const whereClause =
      dealFilter === 'individual'
        ? and(
            eq(deals.tenantId, user.tenantId),
            eq(deals.salesAgent, userFullName),
            gte(deals.dealDate, monthStartDate),
            lt(deals.dealDate, monthEndDate)
          )
        : and(
            eq(deals.tenantId, user.tenantId),
            gte(deals.dealDate, monthStartDate),
            lt(deals.dealDate, monthEndDate)
          )

    const dealsResult = await db.select({ id: deals.id }).from(deals).where(whereClause)

    const totalDeals = dealsResult.length
    if (totalDeals === 0) {
      return {
        totalDeals: 0,
        serviceStats: {
          bb: empty(),
          whc: empty(),
          nfon: empty(),
          mpf_broadband: empty(),
          mpf_voice: empty(),
        },
      }
    }

    const dealIds = dealsResult.map((d) => d.id)

    const provRecords = await db
      .select({ id: provisioning.id })
      .from(provisioning)
      .where(inArray(provisioning.dealId, dealIds))

    const provIds = provRecords.map((p) => p.id)
    if (provIds.length === 0) {
      return {
        totalDeals,
        serviceStats: {
          bb: empty(),
          whc: empty(),
          nfon: empty(),
          mpf_broadband: empty(),
          mpf_voice: empty(),
        },
      }
    }

    const allServiceRows = await db
      .select({
        provisioningId: provisioningServices.provisioningId,
        serviceType: provisioningServices.serviceType,
        status: provisioningServices.status,
        attempt: provisioningServices.attempt,
      })
      .from(provisioningServices)
      .where(inArray(provisioningServices.provisioningId, provIds))
      .orderBy(provisioningServices.attempt)

    const latestMap = new Map<string, (typeof allServiceRows)[number]>()
    for (const row of allServiceRows) {
      const key = `${row.provisioningId}-${row.serviceType}`
      latestMap.set(key, row)
    }
    const serviceRows = Array.from(latestMap.values())

    function calcStats(type: string) {
      const rows = serviceRows.filter((r) => r.serviceType === type)
      const total = rows.length
      const attempted = rows.filter((r) => r.status !== 'not_applied').length
      const live = rows.filter((r) => r.status === 'live').length
      const pct = total > 0 ? Math.round((attempted / total) * 100) : 0
      return { total, attempted, live, pct }
    }

    return {
      totalDeals,
      serviceStats: {
        bb: calcStats('bb'),
        whc: calcStats('whc'),
        nfon: calcStats('nfon'),
        mpf_broadband: calcStats('mpf_broadband'),
        mpf_voice: calcStats('mpf_voice'),
      },
    }
  }

  const [teamStats, individualStats] = await Promise.all([getStats('team'), getStats('individual')])

  return (
    <TargetsClient
      month={monthLabel}
      currentMonth={targetMonth}
      currentYear={targetYear}
      isCurrentMonth={isCurrentMonth}
      teamStats={teamStats}
      individualStats={individualStats}
      userFullName={userFullName}
    />
  )
}
