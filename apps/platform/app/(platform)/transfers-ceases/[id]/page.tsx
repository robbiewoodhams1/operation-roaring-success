import { requireUser } from '@roaring/auth/server'
import {
  db,
  transferCeases,
  transferCeaseComments,
  users,
  provisioning,
  customers,
  deals,
} from '@roaring/db'
import { eq, asc, or } from 'drizzle-orm'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cachedQuery } from '@/lib/cached-query'
import { getChangeHistory } from '@/lib/change-history'
import { ChangeHistory } from '@/components/change-history'
import { Detail } from './detail'
import {
  TRANSFER_CEASE_TYPE_LABELS,
  TRANSFER_CEASE_TYPE_COLOURS,
  TRANSFER_CEASE_STATUS_LABELS,
  TRANSFER_CEASE_STATUS_COLOURS,
} from '@/lib/constants'

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

const getCachedTransferCease = (id: string, tenantId: string) =>
  cachedQuery([`transferCease-${id}`], [`transferCeases-${tenantId}`], () =>
    db.select().from(transferCeases).where(eq(transferCeases.id, id)).limit(1)
  )

const getCachedComments = (id: string, tenantId: string) =>
  cachedQuery([`transferCeaseComments-${id}`], [`transferCeaseComments-${tenantId}`], () =>
    db
      .select()
      .from(transferCeaseComments)
      .where(eq(transferCeaseComments.transferCeaseId, id))
      .orderBy(asc(transferCeaseComments.createdAt))
  )

const getCachedUsers = (tenantId: string) =>
  cachedQuery([`users-${tenantId}`], [`users-${tenantId}`], () =>
    db
      .select({ id: users.id, fullName: users.fullName })
      .from(users)
      .where(eq(users.tenantId, tenantId))
  )

const getCachedProvCustomer = (provisioningId: string, tenantId: string) =>
  cachedQuery(
    [`provisioning-${provisioningId}`],
    [`provisioning-${tenantId}`, `customers-${tenantId}`, `deals-${tenantId}`],
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
        .leftJoin(deals, eq(deals.id, provisioning.dealId))
        .innerJoin(
          customers,
          or(eq(customers.id, deals.customerId), eq(customers.id, provisioning.customerId))
        )
        .where(eq(provisioning.id, provisioningId))
        .limit(1)
  )

export default async function TransferCeaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const user = await requireUser()

  const result = await getCachedTransferCease(id, user.tenantId)
  const record = result[0]
  if (!record || record.tenantId !== user.tenantId) notFound()

  const [comments, allUsers, provResult] = await Promise.all([
    getCachedComments(id, user.tenantId),
    getCachedUsers(user.tenantId),
    record.provisioningId
      ? getCachedProvCustomer(record.provisioningId, user.tenantId)
      : Promise.resolve([] as ProvCustomer[]),
  ])

  const userMap = Object.fromEntries(allUsers.map((u) => [u.id, u.fullName]))
  const provCustomer = provResult[0] ?? null

  const { logs, userNames } = await getChangeHistory([
    { table: 'transfer_ceases', ids: [record.id] },
    { table: 'transfer_cease_comments', parentField: 'transfer_cease_id', parentId: record.id },
  ])

  return (
    <div className="p-6 w-full">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/transfers-ceases">
          <ArrowLeft className="size-4" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold">
              {TRANSFER_CEASE_TYPE_LABELS[record.type] ?? record.type}
            </h1>
            <Badge variant="outline" className={TRANSFER_CEASE_STATUS_COLOURS[record.status]}>
              {TRANSFER_CEASE_STATUS_LABELS[record.status] ?? record.status}
            </Badge>
          </div>
          <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
            <span>Opened {new Date(record.openedAt).toLocaleDateString('en-GB')}</span>
            {record.completedAt && (
              <span>Completed {new Date(record.completedAt).toLocaleDateString('en-GB')}</span>
            )}
          </div>
        </div>
      </div>

      <Detail
        record={record}
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
          tableLabels={{ transfer_ceases: 'Transfer/Cease', transfer_cease_comments: 'Comment' }}
        />
      </div>
    </div>
  )
}
