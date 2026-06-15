import { requireUser } from '@roaring/auth/server'
import { db, deals, dealPricing, users } from '@roaring/db'
import { eq, gte, lt, and } from 'drizzle-orm'
import { SalesTargetsClient } from './targets-client'

export default async function SalesTargetsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; year?: string }>
}) {
  const user = await requireUser()
  const params = await searchParams

  const now = new Date()
  const month =
    params.month && !isNaN(parseInt(params.month)) ? parseInt(params.month) : now.getMonth()
  const year =
    params.year && !isNaN(parseInt(params.year)) ? parseInt(params.year) : now.getFullYear()

  const periodStart = new Date(year, month, 1)
  const periodEnd = new Date(year, month + 1, 1)

  const rows = await db
    .select({
      dealId: deals.id,
      salesAgent: deals.salesAgent,
      closingAgent: deals.closingAgent,
      dealDate: deals.dealDate,
      dealType: deals.dealType,
      monthlyGp: dealPricing.monthlyGp,
    })
    .from(deals)
    .leftJoin(dealPricing, eq(dealPricing.dealId, deals.id))
    .where(
      and(
        eq(deals.tenantId, user.tenantId),
        gte(deals.dealDate, periodStart.toISOString().split('T')[0] ?? ''),
        lt(deals.dealDate, periodEnd.toISOString().split('T')[0] ?? '')
      )
    )

  const userResult = await db
    .select({ fullName: users.fullName })
    .from(users)
    .where(eq(users.id, user.id))
    .limit(1)

  const fullName = userResult[0]?.fullName ?? ''

  return (
    <SalesTargetsClient
      deals={rows.map((r) => ({
        salesAgent: r.salesAgent,
        closingAgent: r.closingAgent,
        dealType: r.dealType,
        monthlyGp: r.monthlyGp ? Number(r.monthlyGp) : 0,
      }))}
      fullName={fullName}
      month={month}
      year={year}
    />
  )
}
