import { requireUser } from '@roaring/auth/server'
import {
  db,
  complaints,
  complaintComments,
  users,
  provisioning,
  customers,
  deals,
} from '@roaring/db'
import { eq, asc } from 'drizzle-orm'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cachedQuery } from '@/lib/cached-query'
import { ComplaintDetail } from './complaint-detail'
import {
  COMPLAINT_STATUS_COLOURS,
  COMPLAINT_STATUS_LABELS,
  COMPLAINT_TYPE_LABELS,
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

export default async function ComplaintDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await requireUser()

  const complaintResult = await cachedQuery(
    [`complaint-${id}-${user.tenantId}`],
    [`complaints-${user.tenantId}`],
    () => db.select().from(complaints).where(eq(complaints.id, id)).limit(1)
  )
  const complaint = complaintResult[0]
  if (!complaint || complaint.tenantId !== user.tenantId) notFound()

  const [comments, allUsers, provResult] = await Promise.all([
    cachedQuery(
      [`complaint-comments-${id}-${user.tenantId}`],
      [`complaints-${user.tenantId}`],
      () =>
        db
          .select()
          .from(complaintComments)
          .where(eq(complaintComments.complaintId, id))
          .orderBy(asc(complaintComments.createdAt))
    ),

    cachedQuery([`users-${user.tenantId}`], [`users-${user.tenantId}`], () =>
      db
        .select({ id: users.id, fullName: users.fullName })
        .from(users)
        .where(eq(users.tenantId, user.tenantId))
    ),

    complaint.provisioningId
      ? cachedQuery(
          [`prov-customer-${complaint.provisioningId}-${user.tenantId}`],
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
              .where(eq(provisioning.id, complaint.provisioningId as string))
              .limit(1)
        )
      : Promise.resolve([] as ProvCustomer[]),
  ])

  const userMap = Object.fromEntries(allUsers.map((u) => [u.id, u.fullName]))
  const provCustomer = provResult[0] ?? null

  return (
    <div className="p-6 w-full">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/complaints">
          <ArrowLeft className="size-4" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold">{complaint.title}</h1>
            <Badge variant="outline" className={COMPLAINT_STATUS_COLOURS[complaint.status]}>
              {COMPLAINT_STATUS_LABELS[complaint.status] ?? complaint.status}
            </Badge>
          </div>
          <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
            <span>{COMPLAINT_TYPE_LABELS[complaint.type] ?? complaint.type}</span>
            {complaint.ticketRef && <span className="font-mono">{complaint.ticketRef}</span>}
            <span>Opened {new Date(complaint.openedAt).toLocaleDateString('en-GB')}</span>
          </div>
        </div>
      </div>

      <ComplaintDetail
        complaint={complaint}
        comments={comments}
        userMap={userMap}
        provCustomer={provCustomer}
        currentUserId={user.id}
        allUsers={allUsers}
      />
    </div>
  )
}
