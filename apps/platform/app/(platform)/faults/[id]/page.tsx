import { requireUser } from '@roaring/auth/server'
import { db, faults, faultComments, users, provisioning, customers, deals } from '@roaring/db'
import { eq, asc } from 'drizzle-orm'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { FaultDetail } from './fault-detail'
import { FAULT_STATUS_COLOURS } from '@/lib/constants'

export default async function FaultDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await requireUser()

  const faultResult = await db.select().from(faults).where(eq(faults.id, id)).limit(1)
  const fault = faultResult[0]
  if (!fault || fault.tenantId !== user.tenantId) notFound()

  const [comments, allUsers, provResult] = await Promise.all([
    db
      .select()
      .from(faultComments)
      .where(eq(faultComments.faultId, id))
      .orderBy(asc(faultComments.createdAt)),

    db
      .select({ id: users.id, fullName: users.fullName })
      .from(users)
      .where(eq(users.tenantId, user.tenantId)),

    fault.provisioningId
      ? db
          .select({
            accountNumber: customers.accountNumber,
            companyName: customers.companyName,
            firstName: customers.firstName,
            lastName: customers.lastName,
          })
          .from(provisioning)
          .innerJoin(deals, eq(deals.id, provisioning.dealId))
          .innerJoin(customers, eq(customers.id, deals.customerId))
          .where(eq(provisioning.id, fault.provisioningId))
          .limit(1)
      : Promise.resolve([]),
  ])

  const userMap = Object.fromEntries(allUsers.map((u) => [u.id, u.fullName]))
  const provCustomer = provResult[0] ?? null

  return (
    <div className="p-6 max-w-4xl">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/faults">
          <ArrowLeft className="size-4" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold">{fault.title}</h1>
            <Badge variant="outline" className={FAULT_STATUS_COLOURS[fault.status]}>
              {fault.status.replace('_', ' ')}
            </Badge>
          </div>
          <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
            <span>{fault.type.toUpperCase()}</span>
            {fault.ticketRef && <span className="font-mono">{fault.ticketRef}</span>}
            <span>Opened {new Date(fault.openedAt).toLocaleDateString('en-GB')}</span>
          </div>
        </div>
      </div>

      <FaultDetail
        fault={fault}
        comments={comments}
        userMap={userMap}
        provCustomer={provCustomer}
        currentUserId={user.id}
        allUsers={allUsers}
      />
    </div>
  )
}
