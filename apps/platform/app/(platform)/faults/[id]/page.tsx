import { requireUser } from '@roaring/auth/server'
import { db, faults, faultComments, users, provisioning, customers, deals } from '@roaring/db'
import { eq, asc, or } from 'drizzle-orm'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { getChangeHistory } from '@/lib/change-history'
import { ChangeHistory } from '@/components/change-history'
import { FaultDetail } from './fault-detail'
import { FAULT_STATUS_COLOURS } from '@/lib/constants'

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
          .leftJoin(deals, eq(deals.id, provisioning.dealId))
          .innerJoin(
            customers,
            or(eq(customers.id, deals.customerId), eq(customers.id, provisioning.customerId))
          )
          .where(eq(provisioning.id, fault.provisioningId))
          .limit(1)
      : Promise.resolve([] as ProvCustomer[]),
  ])

  const userMap = Object.fromEntries(allUsers.map((u) => [u.id, u.fullName]))
  const provCustomer = provResult[0] ?? null

  const { logs, userNames } = await getChangeHistory([
    { table: 'faults', ids: [fault.id] },
    { table: 'fault_comments', parentField: 'fault_id', parentId: fault.id },
  ])

  return (
    <div className="p-6 w-full">
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

      <div className="mt-6">
        <ChangeHistory
          logs={logs}
          userNames={userNames}
          tableLabels={{ faults: 'Fault', fault_comments: 'Comment' }}
        />
      </div>
    </div>
  )
}
