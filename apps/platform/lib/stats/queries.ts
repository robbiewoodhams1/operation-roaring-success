/**
 * Stats Board queries over app.performance_events.
 *
 * Every query is tenant-scoped and filtered on (tenant_id, effective_at) or a
 * narrower indexed prefix, and sums the signed `delta` so reversals net out.
 * Permission checks happen in the callers (lib/stats/permissions.ts) — these
 * functions return whatever they are asked for.
 */
import { sql, type SQL } from 'drizzle-orm'
import type { Coverage } from './compare'
import type { MetricMatch, DeltaRow } from './metrics'
import { BUSINESS_TIME_ZONE, type Range } from './periods'

/** Anything with drizzle's `execute` — the shared `db` or a transaction. */
export interface Executor {
  execute: (query: SQL) => PromiseLike<unknown>
}

async function rows<T>(ex: Executor, query: SQL): Promise<T[]> {
  return (await ex.execute(query)) as T[]
}

export type CreditScope =
  | { kind: 'tenant' }
  | { kind: 'user'; userId: string }
  | { kind: 'team'; teamId: string }
  | { kind: 'unattributed' }

function scopeClause(scope: CreditScope): SQL {
  switch (scope.kind) {
    case 'tenant':
      return sql`true`
    case 'user':
      return sql`e.credited_user_id = ${scope.userId}`
    case 'team':
      return sql`e.team_id = ${scope.teamId}`
    case 'unattributed':
      return sql`e.credited_user_id is null`
  }
}

function matchClause(match: MetricMatch | undefined): SQL {
  if (!match) return sql`true`
  const types = match.serviceTypes
  return types
    ? sql`e.event_type = ${match.eventType} and e.service_type in (${sql.join(
        types.map((t) => sql`${t}`),
        sql`, `
      )})`
    : sql`e.event_type = ${match.eventType}`
}

function rangeClause(range: Range): SQL {
  return sql`e.effective_at >= ${range.start.toISOString()} and e.effective_at < ${range.end.toISOString()}`
}

export async function getCoverage(ex: Executor, tenantId: string): Promise<Coverage> {
  const [row] = await rows<{ live_from: string | null; backfilled_at: string | null }>(
    ex,
    sql`select live_from, backfilled_at from app.performance_tracking where tenant_id = ${tenantId}`
  )
  return {
    // A tenant with no tracking row has no complete history at all.
    liveFrom: row?.live_from ? new Date(row.live_from) : new Date(),
    backfilledAt: row?.backfilled_at ? new Date(row.backfilled_at) : null,
  }
}

export interface TotalsRow extends DeltaRow {
  /** The part of `total` that came from backfilled history. */
  backfilled: number
  /** The part of `total` with no credited employee. */
  unattributed: number
}

interface RawTotals {
  event_type: string
  service_type: string | null
  total: string
  backfilled: string
  unattributed: string
}

function toTotals(r: RawTotals): TotalsRow {
  return {
    eventType: r.event_type,
    serviceType: r.service_type,
    total: Number(r.total),
    backfilled: Number(r.backfilled),
    unattributed: Number(r.unattributed),
  }
}

/** Net credit per event/service type for one scope and range. */
export async function getTotals(
  ex: Executor,
  tenantId: string,
  range: Range,
  scope: CreditScope
): Promise<TotalsRow[]> {
  const result = await rows<RawTotals>(
    ex,
    sql`select e.event_type, e.service_type,
               sum(e.delta) as total,
               coalesce(sum(e.delta) filter (where e.origin = 'backfill'), 0) as backfilled,
               coalesce(sum(e.delta) filter (where e.credited_user_id is null), 0) as unattributed
          from app.performance_events e
         where e.tenant_id = ${tenantId} and ${rangeClause(range)} and ${scopeClause(scope)}
         group by e.event_type, e.service_type`
  )
  return result.map(toTotals)
}

export interface CreditRow extends DeltaRow {
  /** NULL for unattributed credit. */
  userId: string | null
  /** The team the credit counted for at the time — NULL when the employee had none. */
  teamId: string | null
}

/**
 * Net credit per employee (and the team it counted for), for leaderboards and
 * team breakdowns. Pass a team to restrict to credit that counted for it.
 */
export async function getCreditBreakdown(
  ex: Executor,
  tenantId: string,
  range: Range,
  options: { teamId?: string } = {}
): Promise<CreditRow[]> {
  const team = options.teamId ? sql`e.team_id = ${options.teamId}` : sql`true`
  const result = await rows<{
    credited_user_id: string | null
    team_id: string | null
    event_type: string
    service_type: string | null
    total: string
  }>(
    ex,
    sql`select e.credited_user_id, e.team_id, e.event_type, e.service_type, sum(e.delta) as total
          from app.performance_events e
         where e.tenant_id = ${tenantId} and ${rangeClause(range)} and ${team}
         group by e.credited_user_id, e.team_id, e.event_type, e.service_type`
  )
  return result.map((r) => ({
    userId: r.credited_user_id,
    teamId: r.team_id,
    eventType: r.event_type,
    serviceType: r.service_type,
    total: Number(r.total),
  }))
}

export interface TrendRow extends DeltaRow {
  /** London-local bucket start, e.g. "2026-10-13T00:00:00". */
  bucket: string
}

export async function getTrend(
  ex: Executor,
  tenantId: string,
  range: Range,
  bucket: 'hour' | 'day' | 'month',
  scope: CreditScope
): Promise<TrendRow[]> {
  const result = await rows<{
    bucket: string
    event_type: string
    service_type: string | null
    total: string
  }>(
    ex,
    sql`select to_char(date_trunc(${bucket}, e.effective_at at time zone ${BUSINESS_TIME_ZONE}),
                       'YYYY-MM-DD"T"HH24:MI:SS') as bucket,
               e.event_type, e.service_type, sum(e.delta) as total
          from app.performance_events e
         where e.tenant_id = ${tenantId} and ${rangeClause(range)} and ${scopeClause(scope)}
         group by 1, e.event_type, e.service_type
         order by 1`
  )
  return result.map((r) => ({
    bucket: r.bucket,
    eventType: r.event_type,
    serviceType: r.service_type,
    total: Number(r.total),
  }))
}

export interface Person {
  id: string
  fullName: string
  role: string
  isActive: boolean
  approvalStatus: string
  teamId: string | null
  teamName: string | null
}

export async function getPeople(ex: Executor, tenantId: string): Promise<Person[]> {
  const result = await rows<{
    id: string
    full_name: string
    role: string
    is_active: boolean
    approval_status: string
    team_id: string | null
    team_name: string | null
  }>(
    ex,
    sql`select u.id, u.full_name, u.role, u.is_active, u.approval_status, u.team_id, t.name as team_name
          from app.users u
          left join app.teams t on t.id = u.team_id
         where u.tenant_id = ${tenantId}
         order by u.full_name`
  )
  return result.map((r) => ({
    id: r.id,
    fullName: r.full_name,
    role: r.role,
    isActive: r.is_active,
    approvalStatus: r.approval_status,
    teamId: r.team_id,
    teamName: r.team_name,
  }))
}

export interface Team {
  id: string
  name: string
  isActive: boolean
}

export async function getTeams(ex: Executor, tenantId: string): Promise<Team[]> {
  const result = await rows<{ id: string; name: string; is_active: boolean }>(
    ex,
    sql`select id, name, is_active from app.teams where tenant_id = ${tenantId} order by name`
  )
  return result.map((r) => ({ id: r.id, name: r.name, isActive: r.is_active }))
}

// ─── Event listings ──────────────────────────────────────────────────────────

export type EventScope =
  | { kind: 'tenant' }
  /** Events credited to the user. */
  | { kind: 'credited'; userId: string }
  /** Events credited to, or performed by, the user. */
  | { kind: 'involving'; userId: string }
  /** Events that counted for the team, plus anything involving the user. */
  | { kind: 'team'; teamId: string; userId?: string }
  | { kind: 'unattributed' }

function eventScopeClause(scope: EventScope): SQL {
  switch (scope.kind) {
    case 'tenant':
      return sql`true`
    case 'credited':
      return sql`e.credited_user_id = ${scope.userId}`
    case 'involving':
      return sql`(e.credited_user_id = ${scope.userId} or e.actor_user_id = ${scope.userId})`
    case 'team':
      return scope.userId
        ? sql`(e.team_id = ${scope.teamId} or e.credited_user_id = ${scope.userId} or e.actor_user_id = ${scope.userId})`
        : sql`e.team_id = ${scope.teamId}`
    case 'unattributed':
      return sql`e.credited_user_id is null`
  }
}

export interface EventCursor {
  occurredAt: string
  recordedAt: string
  id: string
}

export interface StatsEvent {
  id: string
  eventType: string
  kind: 'award' | 'reversal'
  serviceType: string | null
  sourceType: string
  sourceId: string
  subjectKey: string
  creditedUserId: string | null
  creditedName: string | null
  creditedActive: boolean | null
  actorUserId: string | null
  actorName: string | null
  teamName: string | null
  attribution: 'recorded' | 'unattributed'
  origin: 'live' | 'backfill'
  occurredAt: string
  effectiveAt: string
  recordedAt: string
  reason: string | null
  detail: Record<string, unknown>
}

export interface EventPage {
  events: StatsEvent[]
  nextCursor: EventCursor | null
}

/** Newest-first, keyset-paginated event listing. */
export async function getEvents(
  ex: Executor,
  tenantId: string,
  options: {
    scope: EventScope
    range?: Range
    match?: MetricMatch
    eventTypes?: readonly string[]
    limit?: number
    cursor?: EventCursor | null
  }
): Promise<EventPage> {
  const limit = Math.min(Math.max(options.limit ?? 25, 1), 100)
  const types =
    options.eventTypes && options.eventTypes.length > 0
      ? sql`e.event_type in (${sql.join(
          options.eventTypes.map((t) => sql`${t}`),
          sql`, `
        )})`
      : sql`true`
  const cursor = options.cursor
    ? sql`(e.occurred_at, e.recorded_at, e.id) < (${options.cursor.occurredAt}::timestamptz,
                                                  ${options.cursor.recordedAt}::timestamptz,
                                                  ${options.cursor.id}::uuid)`
    : sql`true`

  const result = await rows<{
    id: string
    event_type: string
    kind: 'award' | 'reversal'
    service_type: string | null
    source_type: string
    source_id: string
    subject_key: string
    credited_user_id: string | null
    credited_name: string | null
    credited_active: boolean | null
    actor_user_id: string | null
    actor_name: string | null
    team_name: string | null
    attribution: 'recorded' | 'unattributed'
    origin: 'live' | 'backfill'
    occurred_at: string
    effective_at: string
    recorded_at: string
    reason: string | null
    detail: Record<string, unknown> | null
  }>(
    ex,
    sql`select e.id, e.event_type, e.kind, e.service_type, e.source_type, e.source_id, e.subject_key,
               e.credited_user_id, cu.full_name as credited_name, cu.is_active as credited_active,
               e.actor_user_id, au.full_name as actor_name, t.name as team_name,
               e.attribution, e.origin,
               to_char(e.occurred_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') as occurred_at,
               to_char(e.effective_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') as effective_at,
               to_char(e.recorded_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') as recorded_at,
               e.reason, e.detail
          from app.performance_events e
          left join app.users cu on cu.id = e.credited_user_id
          left join app.users au on au.id = e.actor_user_id
          left join app.teams t on t.id = e.team_id
         where e.tenant_id = ${tenantId}
           and ${options.range ? rangeClause(options.range) : sql`true`}
           and ${matchClause(options.match)}
           and ${types}
           and ${eventScopeClause(options.scope)}
           and ${cursor}
         order by e.occurred_at desc, e.recorded_at desc, e.id desc
         limit ${limit + 1}`
  )

  const page = result.slice(0, limit)
  const last = page[page.length - 1]
  return {
    events: page.map((r) => ({
      id: r.id,
      eventType: r.event_type,
      kind: r.kind,
      serviceType: r.service_type,
      sourceType: r.source_type,
      sourceId: r.source_id,
      subjectKey: r.subject_key,
      creditedUserId: r.credited_user_id,
      creditedName: r.credited_name,
      creditedActive: r.credited_active,
      actorUserId: r.actor_user_id,
      actorName: r.actor_name,
      teamName: r.team_name,
      attribution: r.attribution,
      origin: r.origin,
      occurredAt: r.occurred_at,
      effectiveAt: r.effective_at,
      recordedAt: r.recorded_at,
      reason: r.reason,
      detail: r.detail ?? {},
    })),
    nextCursor:
      result.length > limit && last
        ? { occurredAt: last.occurred_at, recordedAt: last.recorded_at, id: last.id }
        : null,
  }
}
