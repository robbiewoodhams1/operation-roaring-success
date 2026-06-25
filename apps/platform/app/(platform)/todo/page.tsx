import { requireUser } from '@roaring/auth/server'
import {
  db,
  todos,
  users,
  customers,
  provisioning,
  deals,
  faults,
  complaints,
  debts,
} from '@roaring/db'
import { eq, or, desc } from 'drizzle-orm'
import { TodoClient } from './todo-client'

export default async function TodoPage() {
  const user = await requireUser()

  const [myTodos, allUsers, allCustomers, allProvisioning, allFaults, allComplaints, allDebts] =
    await Promise.all([
      db
        .select()
        .from(todos)
        .where(or(eq(todos.assignedTo, user.id), eq(todos.assignedBy, user.id ?? '')))
        .orderBy(desc(todos.createdAt)),

      db
        .select({ id: users.id, fullName: users.fullName })
        .from(users)
        .where(eq(users.tenantId, user.tenantId)),

      db
        .select({
          id: customers.id,
          accountNumber: customers.accountNumber,
          companyName: customers.companyName,
          firstName: customers.firstName,
          lastName: customers.lastName,
        })
        .from(customers)
        .where(eq(customers.tenantId, user.tenantId)),

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

      db
        .select({ id: faults.id, title: faults.title })
        .from(faults)
        .where(eq(faults.tenantId, user.tenantId)),

      db
        .select({ id: complaints.id, title: complaints.title })
        .from(complaints)
        .where(eq(complaints.tenantId, user.tenantId)),

      db
        .select({ id: debts.id, title: debts.title })
        .from(debts)
        .where(eq(debts.tenantId, user.tenantId)),
    ])

  const userMap = Object.fromEntries(allUsers.map((u) => [u.id, u.fullName]))

  const linkOptions = {
    customer: allCustomers.map((c) => ({
      id: c.id,
      label: `${c.accountNumber} — ${c.companyName ?? `${c.firstName} ${c.lastName}`}`,
    })),
    provisioning: allProvisioning.map((p) => ({
      id: p.id,
      label: `${p.accountNumber} — ${p.companyName ?? `${p.firstName} ${p.lastName}`}`,
    })),
    fault: allFaults.map((f) => ({ id: f.id, label: f.title })),
    complaint: allComplaints.map((c) => ({ id: c.id, label: c.title })),
    debt: allDebts.map((d) => ({ id: d.id, label: d.title })),
  }

  return (
    <TodoClient
      todos={myTodos}
      userId={user.id}
      userMap={userMap}
      allUsers={allUsers}
      linkOptions={linkOptions}
    />
  )
}
