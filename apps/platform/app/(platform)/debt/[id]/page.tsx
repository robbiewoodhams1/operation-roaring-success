import { requireUser } from '@roaring/auth/server'
import { db, debts, debtComments, users, provisioning, customers, deals } from '@roaring/db'
import { eq, asc } from 'drizzle-orm'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cachedQuery } from '@/lib/cached-query'
import { DebtDetail } from './debt-detail'
import { DEBT_OUTCOME_COLOURS, DEBT_OUTCOME_LABELS } from '@/lib/constants'

type ProvCustomer = {
  accountNumber: string
  companyName: string | null
  firstName: string
  lastName: string
  mobile: string | null
  landline: string | null
  email: string | null
  addressLine1: string | null
  addressLine2: string | null
  addressLine3: string | null
  addressLine4: string | null
  postcode: string | null
}

export default async function DebtDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await requireUser()

  const debtResult = await cachedQuery([`debt-${id}`], [`debts-${user.tenantId}`], () =>
    db.select().from(debts).where(eq(debts.id, id)).limit(1)
  )
  const debt = debtResult[0]
  if (!debt || debt.tenantId !== user.tenantId) notFound()

  const [comments, allUsers, provResult] = await Promise.all([
    cachedQuery([`debt-comments-${id}`], [`debts-${user.tenantId}`], () =>
      db
        .select()
        .from(debtComments)
        .where(eq(debtComments.debtId, id))
        .orderBy(asc(debtComments.createdAt))
    ),
    cachedQuery([`users-${user.tenantId}`], [`users-${user.tenantId}`], () =>
      db
        .select({ id: users.id, fullName: users.fullName })
        .from(users)
        .where(eq(users.tenantId, user.tenantId))
    ),
    debt.provisioningId
      ? cachedQuery(
          [`provisioning-customer-${debt.provisioningId}`],
          [`provisioning-${user.tenantId}`],
          () =>
            db
              .select({
                accountNumber: customers.accountNumber,
                companyName: customers.companyName,
                firstName: customers.firstName,
                lastName: customers.lastName,
                mobile: customers.mobile,
                landline: customers.landline,
                email: customers.email,
                addressLine1: customers.addressLine1,
                addressLine2: customers.addressLine2,
                addressLine3: customers.addressLine3,
                addressLine4: customers.addressLine4,
                postcode: customers.postcode,
              })
              .from(provisioning)
              .innerJoin(deals, eq(deals.id, provisioning.dealId))
              .innerJoin(customers, eq(customers.id, deals.customerId))
              .where(eq(provisioning.id, debt.provisioningId as string))
              .limit(1)
        )
      : Promise.resolve([] as ProvCustomer[]),
  ])

  const userMap = Object.fromEntries(allUsers.map((u) => [u.id, u.fullName]))
  const provCustomer = provResult[0] ?? null

  return (
    <div className="p-6 max-w-4xl">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/debt">
          <ArrowLeft className="size-4" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold">{debt.title}</h1>
            {debt.outcome && (
              <Badge variant="outline" className={DEBT_OUTCOME_COLOURS[debt.outcome]}>
                {DEBT_OUTCOME_LABELS[debt.outcome] ?? debt.outcome}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
            <span className="font-mono font-medium">£{Number(debt.totalOwed).toFixed(2)}</span>
            <span>Opened {new Date(debt.openedAt).toLocaleDateString('en-GB')}</span>
          </div>
        </div>
      </div>

      <DebtDetail
        debt={debt}
        comments={comments}
        userMap={userMap}
        provCustomer={provCustomer}
        currentUserId={user.id}
        allUsers={allUsers}
      />
    </div>
  )
}
