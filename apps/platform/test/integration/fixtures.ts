/**
 * Synthetic records for database integration tests. Everything is created
 * inside a transaction that `inRollback` always rolls back, so no test data is
 * ever committed to the Local or Staging database.
 */
import { db } from '@roaring/db'
import { sql } from 'drizzle-orm'

export type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0]

class Rollback extends Error {}

export async function inRollback(fn: (tx: Tx) => Promise<void>): Promise<void> {
  try {
    await db.transaction(async (tx) => {
      await fn(tx)
      throw new Rollback()
    })
  } catch (err) {
    if (!(err instanceof Rollback)) throw err
  }
}

/** Runs `fn` in a savepoint and returns the error it raised (the outer transaction survives). */
export async function expectDbError(tx: Tx, fn: (tx: Tx) => Promise<unknown>): Promise<Error> {
  try {
    await tx.transaction(async (sp) => {
      await fn(sp)
    })
  } catch (err) {
    return err as Error
  }
  throw new Error('expected a database error')
}

export async function query<T = Record<string, unknown>>(
  tx: Tx,
  q: ReturnType<typeof sql>
): Promise<T[]> {
  return (await tx.execute(q)) as unknown as T[]
}

export async function one<T = Record<string, unknown>>(
  tx: Tx,
  q: ReturnType<typeof sql>
): Promise<T> {
  const [row] = await query<T>(tx, q)
  if (!row) throw new Error('expected a row')
  return row
}

/**
 * The database server's current time. Triggers stamp events with the server's
 * `now()`, so a period ending "now" must use the server clock — the test
 * runner's `new Date()` can lag it (e.g. a laptop ~1 s behind Staging), which
 * would put just-recorded events after the period end.
 */
export async function dbNow(tx: Tx): Promise<Date> {
  const { ms } = await one<{ ms: number | string }>(
    tx,
    sql`select extract(epoch from clock_timestamp())::float8 * 1000 as ms`
  )
  // Round up: the period end is exclusive and must not fall before a sub-millisecond event time.
  return new Date(Math.ceil(Number(ms)))
}

/** Declares who is performing the next writes, exactly as setAuditUser does. */
export async function actAs(tx: Tx, userId: string | null) {
  await tx.execute(sql`select set_config('app.current_user_id', ${userId ?? ''}, true)`)
}

export interface World {
  tenantId: string
  otherTenantId: string
  teamA: string
  teamB: string
  alice: string // agent, team A
  bob: string // agent, team A
  carol: string // team leader, team A
  dave: string // agent, team B
  manager: string // manager, no team
  erin: string // inactive agent, team B
  outsider: string // agent in the other tenant
  customerId: string
  otherCustomerId: string
}

async function tenant(tx: Tx, label: string) {
  const row = await one<{ id: string }>(
    tx,
    sql`insert into app.tenants (name, slug, database_url)
        values (${`Synthetic ${label}`}, ${`synthetic-${label}-${crypto.randomUUID()}`}, 'synthetic')
        returning id`
  )
  return row.id
}

async function team(tx: Tx, tenantId: string, name: string) {
  return (
    await one<{ id: string }>(
      tx,
      sql`insert into app.teams (tenant_id, name) values (${tenantId}, ${name}) returning id`
    )
  ).id
}

async function user(
  tx: Tx,
  tenantId: string,
  name: string,
  role: string,
  teamId: string | null,
  isActive = true
) {
  return (
    await one<{ id: string }>(
      tx,
      sql`insert into app.users (id, tenant_id, email, full_name, role, approval_status, is_active, team_id)
          values (gen_random_uuid(), ${tenantId}, ${`${crypto.randomUUID()}@synthetic.invalid`},
                  ${`Synthetic ${name}`}, ${role}::app.user_role, 'approved', ${isActive}, ${teamId})
          returning id`
    )
  ).id
}

async function customer(tx: Tx, tenantId: string, createdBy: string) {
  return (
    await one<{ id: string }>(
      tx,
      sql`insert into app.customers (tenant_id, account_number, type, first_name, last_name, status, created_by)
          values (${tenantId}, ${`SYN-${crypto.randomUUID().slice(0, 12)}`}, 'residential',
                  'Synthetic', 'Customer', 'prospect', ${createdBy})
          returning id`
    )
  ).id
}

export async function buildWorld(tx: Tx): Promise<World> {
  const tenantId = await tenant(tx, 'stats-qa')
  const otherTenantId = await tenant(tx, 'stats-qa-other')
  const teamA = await team(tx, tenantId, 'Synthetic Team A')
  const teamB = await team(tx, tenantId, 'Synthetic Team B')
  const alice = await user(tx, tenantId, 'Alice', 'agent', teamA)
  const bob = await user(tx, tenantId, 'Bob', 'agent', teamA)
  const carol = await user(tx, tenantId, 'Carol', 'team_leader', teamA)
  const dave = await user(tx, tenantId, 'Dave', 'agent', teamB)
  const manager = await user(tx, tenantId, 'Morgan', 'manager', null)
  const erin = await user(tx, tenantId, 'Erin', 'agent', teamB, false)
  const outsider = await user(tx, otherTenantId, 'Olly', 'agent', null)
  const customerId = await customer(tx, tenantId, alice)
  const otherCustomerId = await customer(tx, otherTenantId, outsider)
  return {
    tenantId,
    otherTenantId,
    teamA,
    teamB,
    alice,
    bob,
    carol,
    dave,
    manager,
    erin,
    outsider,
    customerId,
    otherCustomerId,
  }
}

export async function insertDeal(
  tx: Tx,
  w: Pick<World, 'tenantId' | 'customerId'>,
  opts: { sales: string | null; closing: string | null; createdBy: string; submissionKey?: string }
) {
  return await one<{ id: string; created_by: string }>(
    tx,
    sql`insert into app.deals (tenant_id, customer_id, sales_agent, closing_agent, sales_agent_id, closing_agent_id,
                                 deal_type, deal_date, created_by, submission_key)
          values (${w.tenantId}, ${w.customerId}, 'Synthetic', 'Synthetic', ${opts.sales}, ${opts.closing},
                  'residential', current_date, ${opts.createdBy}, ${opts.submissionKey ?? null})
          returning id, created_by`
  )
}

export async function insertProvisioning(
  tx: Tx,
  tenantId: string,
  opts: { provisioner?: string | null; routerAssignee?: string | null; dealId?: string | null } = {}
) {
  return (
    await one<{ id: string }>(
      tx,
      sql`insert into app.provisioning (tenant_id, deal_id, provisioner_user_id, router_assigned_user_id)
          values (${tenantId}, ${opts.dealId ?? null}, ${opts.provisioner ?? null}, ${opts.routerAssignee ?? null})
          returning id`
    )
  ).id
}

export async function insertService(
  tx: Tx,
  provisioningId: string,
  serviceType: string,
  attempt = 1,
  status = 'not_applied'
) {
  return (
    await one<{ id: string }>(
      tx,
      sql`insert into app.provisioning_services (provisioning_id, service_type, status, attempt)
          values (${provisioningId}, ${serviceType}::app.service_type, ${status}::app.service_status, ${attempt})
          returning id`
    )
  ).id
}

export async function setServiceStatus(tx: Tx, serviceId: string, status: string) {
  await tx.execute(
    sql`update app.provisioning_services set status = ${status}::app.service_status where id = ${serviceId}`
  )
}

export interface EventRow {
  id: string
  event_type: string
  kind: string
  delta: number
  sequence: number
  credited_user_id: string | null
  actor_user_id: string | null
  team_id: string | null
  attribution: string
  origin: string
  subject_key: string
  service_group: string | null
  reverses_event_id: string | null
  reason: string | null
  occurred_at: Date
  effective_at: Date
}

export async function eventsFor(tx: Tx, tenantId: string, eventType?: string) {
  return query<EventRow>(
    tx,
    sql`select * from app.performance_events
         where tenant_id = ${tenantId} ${eventType ? sql`and event_type = ${eventType}` : sql``}
         order by recorded_at`
  )
}

export async function net(tx: Tx, tenantId: string, eventType: string, subjectKey?: string) {
  const row = await one<{ n: string }>(
    tx,
    sql`select coalesce(sum(delta), 0) as n from app.performance_events
         where tenant_id = ${tenantId} and event_type = ${eventType}
           ${subjectKey ? sql`and subject_key = ${subjectKey}` : sql``}`
  )
  return Number(row.n)
}

/** Records an event at a chosen time (the triggers always use the current time). */
export async function recordAt(
  tx: Tx,
  opts: {
    tenantId: string
    eventType: string
    subject: string
    credited: string | null
    occurredAt: Date
    serviceType?: string | null
    origin?: 'live' | 'backfill'
  }
) {
  return (
    await one<{ id: string | null }>(
      tx,
      sql`select app.record_performance_event(
            ${opts.tenantId}::uuid, ${opts.eventType}, 'award', 'synthetic', gen_random_uuid(), ${opts.subject},
            ${opts.credited}::uuid, ${opts.occurredAt.toISOString()}::timestamptz, ${opts.serviceType ?? null}, '{}'::jsonb,
            ${opts.origin ?? 'live'}, null, null, null) as id`
    )
  ).id
}
