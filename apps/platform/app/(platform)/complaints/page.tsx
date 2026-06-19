import { requireUser } from '@roaring/auth/server'
import { db, complaints, users, provisioning, customers, deals } from '@roaring/db'
import { eq, desc } from 'drizzle-orm'
import { ComplaintsFilters } from './complaints-filters'
import { CreateComplaintModal } from './create-complaint-modal'

export default async function ComplaintsPage() {
  const user = await requireUser()

  const [allComplaints, allUsers, allProvisioning] = await Promise.all([
    db
      .select({
        id: complaints.id,
        title: complaints.title,
        type: complaints.type,
        status: complaints.status,
        ticketRef: complaints.ticketRef,
        openedAt: complaints.openedAt,
        closedAt: complaints.closedAt,
        assignedTo: complaints.assignedTo,
        provisioningId: complaints.provisioningId,
        createdAt: complaints.createdAt,
      })
      .from(complaints)
      .where(eq(complaints.tenantId, user.tenantId))
      .orderBy(desc(complaints.createdAt)),

    db
      .select({ id: users.id, fullName: users.fullName })
      .from(users)
      .where(eq(users.tenantId, user.tenantId)),

    db
      .select({
        id: provisioning.id,
        accountNumber: customers.accountNumber,
        companyName: customers.companyName,
        firstName: customers.firstName,
        lastName: customers.lastName,
      })
      .from(provisioning)
      .innerJoin(deals, eq(deals.id, provisioning.dealId))
      .innerJoin(customers, eq(customers.id, deals.customerId))
      .where(eq(provisioning.tenantId, user.tenantId)),
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
          <h1 className="text-2xl font-semibold">Complaints</h1>
          <p className="text-sm text-muted-foreground mt-1">{allComplaints.length} complaints</p>
        </div>
        <CreateComplaintModal
          users={allUsers}
          provisioning={allProvisioning.map((p) => ({ id: p.id, accountNumber: p.accountNumber }))}
        />
      </div>
      <ComplaintsFilters complaints={allComplaints} userMap={userMap} provMap={provMap} />
    </div>
  )
}
