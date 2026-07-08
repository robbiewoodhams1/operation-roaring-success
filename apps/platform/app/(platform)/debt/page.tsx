import { requireUser } from '@roaring/auth/server'
import { db, debts, users, provisioning, customers, deals } from '@roaring/db'
import { eq, desc, or } from 'drizzle-orm'
import { cachedQuery } from '@/lib/cached-query'
import { DebtFilters } from './debt-filters'
import { CreateDebtModal } from './create-debt-modal'

export default async function DebtPage() {
  const user = await requireUser()

  const [allDebts, allUsers, allProvisioning] = await Promise.all([
    cachedQuery([`debts-${user.tenantId}`], [`debts-${user.tenantId}`], () =>
      db
        .select({
          id: debts.id,
          title: debts.title,
          outcome: debts.outcome,
          totalOwed: debts.totalOwed,
          paymentTried: debts.paymentTried,
          paymentType: debts.paymentType,
          dateOfPayment: debts.dateOfPayment,
          openedAt: debts.openedAt,
          closedAt: debts.closedAt,
          assignedTo: debts.assignedTo,
          provisioningId: debts.provisioningId,
          createdAt: debts.createdAt,
        })
        .from(debts)
        .where(eq(debts.tenantId, user.tenantId))
        .orderBy(desc(debts.createdAt))
    ),

    cachedQuery([`users-${user.tenantId}`], [`users-${user.tenantId}`], () =>
      db
        .select({ id: users.id, fullName: users.fullName })
        .from(users)
        .where(eq(users.tenantId, user.tenantId))
    ),

    cachedQuery([`provisioning-${user.tenantId}`], [`provisioning-${user.tenantId}`], () =>
      db
        .select({
          id: provisioning.id,
          accountNumber: customers.accountNumber,
          companyName: customers.companyName,
          firstName: customers.firstName,
          lastName: customers.lastName,
        })
        .from(provisioning)
        .leftJoin(deals, eq(deals.id, provisioning.dealId))
        .innerJoin(
          customers,
          or(eq(customers.id, deals.customerId), eq(customers.id, provisioning.customerId))
        )
        .where(eq(provisioning.tenantId, user.tenantId))
    ),
  ])

  const userMap = Object.fromEntries(allUsers.map((u) => [u.id, u.fullName]))
  const provMap = Object.fromEntries(
    allProvisioning.map((p) => [
      p.id,
      { accountNumber: p.accountNumber, name: p.companyName ?? `${p.firstName} ${p.lastName}` },
    ])
  )

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Debt</h1>
          <p className="text-sm text-muted-foreground mt-1">{allDebts.length} records</p>
        </div>
        <CreateDebtModal
          users={allUsers}
          provisioning={allProvisioning.map((p) => ({ id: p.id, accountNumber: p.accountNumber }))}
        />
      </div>
      <DebtFilters debts={allDebts} userMap={userMap} provMap={provMap} />
    </div>
  )
}
