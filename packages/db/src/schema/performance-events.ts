import { integer, jsonb, smallint, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { appSchema, tenants } from './tenants'
import { users } from './users'
import { teams } from './teams'

/**
 * Append-only credit ledger for the Stats Board (migration 0002). Rows are
 * written only by database triggers via app.record_performance_event() — the
 * app reads this table but never inserts into it. See docs/STATS.md.
 */
export const performanceEvents = appSchema.table('performance_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id),
  eventType: text('event_type').notNull(),
  kind: text('kind').$type<'award' | 'reversal'>().notNull(),
  /** +1 for an award, -1 for a reversal (generated). */
  delta: smallint('delta'),
  sequence: integer('sequence').notNull(),
  sourceType: text('source_type').notNull(),
  sourceId: uuid('source_id').notNull(),
  subjectKey: text('subject_key').notNull(),
  serviceType: text('service_type'),
  serviceGroup: text('service_group'),
  detail: jsonb('detail').notNull(),
  creditedUserId: uuid('credited_user_id').references(() => users.id),
  actorUserId: uuid('actor_user_id').references(() => users.id),
  teamId: uuid('team_id').references(() => teams.id),
  attribution: text('attribution').$type<'recorded' | 'unattributed'>().notNull(),
  origin: text('origin').$type<'live' | 'backfill'>().notNull(),
  occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull(),
  effectiveAt: timestamp('effective_at', { withTimezone: true }).notNull(),
  recordedAt: timestamp('recorded_at', { withTimezone: true }).notNull(),
  idempotencyKey: text('idempotency_key').notNull(),
  reversesEventId: uuid('reverses_event_id'),
  reason: text('reason'),
})

export const performanceTracking = appSchema.table('performance_tracking', {
  tenantId: uuid('tenant_id')
    .primaryKey()
    .references(() => tenants.id),
  liveFrom: timestamp('live_from', { withTimezone: true }).notNull(),
  backfilledAt: timestamp('backfilled_at', { withTimezone: true }),
  backfillReport: jsonb('backfill_report'),
})

export type PerformanceEvent = typeof performanceEvents.$inferSelect
