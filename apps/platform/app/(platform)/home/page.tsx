import { requireUser } from '@roaring/auth/server'
import { db, deals, customers, provisioning, auditLogs, users } from '@roaring/db'
import { eq, gte, desc, and } from 'drizzle-orm'
import { HomeClient } from './home-client'

export default async function HomePage() {
  const user = await requireUser()

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  const [dealsToday, customersTotal, provisioningActive, recentActivity, currentUser] =
    await Promise.all([
      // Deals submitted today
      db
        .select({ id: deals.id })
        .from(deals)
        .where(and(eq(deals.tenantId, user.tenantId), gte(deals.createdAt, todayStart))),

      // Total active customers
      db
        .select({ id: customers.id })
        .from(customers)
        .where(and(eq(customers.tenantId, user.tenantId), eq(customers.status, 'active'))),

      // Provisioning in progress (not started or applied)
      db
        .select({ id: provisioning.id })
        .from(provisioning)
        .where(
          and(eq(provisioning.tenantId, user.tenantId), eq(provisioning.status, 'not_started'))
        ),

      // Recent audit activity
      db.select().from(auditLogs).orderBy(desc(auditLogs.changedAt)).limit(8),

      // Current user name
      db.query.users.findFirst({
        where: eq(users.id, user.id),
      }),
    ])

  const firstName = currentUser?.fullName ?? 'there'

  return (
    <HomeClient
      firstName={firstName}
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
