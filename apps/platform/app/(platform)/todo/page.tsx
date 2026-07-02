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
import { eq, or } from 'drizzle-orm'
import { cachedQuery } from '@/lib/cached-query'
import { TodoFilters } from './todo-filters'
import { CreateTodoModal } from './create-todo-modal'

const getCachedMyTodos = (tenantId: string, userId: string) =>
  cachedQuery([`todos-${tenantId}-${userId}`], [`todos-${tenantId}-${userId}`], () =>
    db
      .select()
      .from(todos)
      .where(or(eq(todos.assignedTo, userId), eq(todos.assignedBy, userId)))
  )

const getCachedTodoUsers = (tenantId: string) =>
  cachedQuery([`users-${tenantId}`], [`users-${tenantId}`], () =>
    db
      .select({ id: users.id, fullName: users.fullName, isActive: users.isActive })
      .from(users)
      .where(eq(users.tenantId, tenantId))
  )

const getCachedTodoCustomers = (tenantId: string) =>
  cachedQuery([`customers-${tenantId}`], [`customers-${tenantId}`], () =>
    db
      .select({
        id: customers.id,
        accountNumber: customers.accountNumber,
        companyName: customers.companyName,
        firstName: customers.firstName,
        lastName: customers.lastName,
      })
      .from(customers)
      .where(eq(customers.tenantId, tenantId))
  )

const getCachedTodoProvisioning = (tenantId: string) =>
  cachedQuery([`provisioning-${tenantId}`], [`provisioning-${tenantId}`], () =>
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
      .where(eq(provisioning.tenantId, tenantId))
  )

const getCachedTodoFaults = (tenantId: string) =>
  cachedQuery([`faults-${tenantId}`], [`faults-${tenantId}`], () =>
    db
      .select({ id: faults.id, title: faults.title })
      .from(faults)
      .where(eq(faults.tenantId, tenantId))
  )

const getCachedTodoComplaints = (tenantId: string) =>
  cachedQuery([`complaints-${tenantId}`], [`complaints-${tenantId}`], () =>
    db
      .select({ id: complaints.id, title: complaints.title })
      .from(complaints)
      .where(eq(complaints.tenantId, tenantId))
  )

const getCachedTodoDebts = (tenantId: string) =>
  cachedQuery([`debts-${tenantId}`], [`debts-${tenantId}`], () =>
    db.select({ id: debts.id, title: debts.title }).from(debts).where(eq(debts.tenantId, tenantId))
  )

export default async function TodoPage() {
  const user = await requireUser()

  const [myTodos, allUsers, allCustomers, allProvisioning, allFaults, allComplaints, allDebts] =
    await Promise.all([
      getCachedMyTodos(user.tenantId, user.id),
      getCachedTodoUsers(user.tenantId),
      getCachedTodoCustomers(user.tenantId),
      getCachedTodoProvisioning(user.tenantId),
      getCachedTodoFaults(user.tenantId),
      getCachedTodoComplaints(user.tenantId),
      getCachedTodoDebts(user.tenantId),
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
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">To do</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {myTodos.filter((t) => t.status !== 'completed' && t.status !== 'cancelled').length}{' '}
            active tasks
          </p>
        </div>
        <CreateTodoModal userId={user.id} allUsers={allUsers} linkOptions={linkOptions} />
      </div>
      <TodoFilters todos={myTodos} userId={user.id} userMap={userMap} />
    </div>
  )
}
