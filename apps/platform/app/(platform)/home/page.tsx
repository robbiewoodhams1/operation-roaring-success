import { requireUser } from '@roaring/auth/server'
import { db, deals, customers, provisioning, auditLogs, users } from '@roaring/db'
import { eq, gte, desc, and } from 'drizzle-orm'
import { HomeClient } from './home-client'

export default async function HomePage() {
  const user = await requireUser()

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  const [dealsToday, customersTotal, provisioningActive, recentActivity, currentUserResult] =
    await Promise.all([
      db
        .select({ id: deals.id })
        .from(deals)
        .where(and(eq(deals.tenantId, user.tenantId), gte(deals.createdAt, todayStart))),

      db
        .select({ id: customers.id })
        .from(customers)
        .where(and(eq(customers.tenantId, user.tenantId), eq(customers.status, 'active' as any))),

      db
        .select({ id: provisioning.id })
        .from(provisioning)
        .where(
          and(
            eq(provisioning.tenantId, user.tenantId),
            eq(provisioning.status, 'not_started' as any)
          )
        ),

      db.select().from(auditLogs).orderBy(desc(auditLogs.changedAt)).limit(8),

      db.select({ fullName: users.fullName }).from(users).where(eq(users.id, user.id)).limit(1),
    ])

  const fullName = currentUserResult[0] ? currentUserResult[0].fullName : 'there'

  return (
    <HomeClient
      fullName={fullName}
      stats={{
        dealsToday: dealsToday.length,
        activeCustomers: customersTotal.length,
        pendingProvisioning: provisioningActive.length,
      }}
      recentActivity={recentActivity}
      userId={user.id}
    />
  )
}
