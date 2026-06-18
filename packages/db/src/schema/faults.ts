import { pgEnum, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { appSchema, tenants } from './tenants'
import { users } from './users'
import { provisioning } from './provisioning'

export const faultStatusEnum = appSchema.enum('fault_status', [
  'outstanding',
  'in_progress',
  'resolved',
])

export const faultTypeEnum = appSchema.enum('fault_type', [
  'bb',
  'line',
  'upgrade',
  'dfb',
  'provisioning',
  'mobile',
  'ticket',
])

export const faults = appSchema.table('faults', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id),
  provisioningId: uuid('provisioning_id').references(() => provisioning.id),
  assignedTo: uuid('assigned_to').references(() => users.id),
  title: text('title').notNull(),
  type: faultTypeEnum('type').notNull(),
  status: faultStatusEnum('status').notNull().default('outstanding'),
  ticketRef: text('ticket_ref'),
  ticketRaisedAt: timestamp('ticket_raised_at', { withTimezone: true }),
  openedAt: timestamp('opened_at', { withTimezone: true }).notNull().defaultNow(),
  resolvedAt: timestamp('resolved_at', { withTimezone: true }),
  createdBy: uuid('created_by')
    .notNull()
    .references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const faultComments = appSchema.table('fault_comments', {
  id: uuid('id').primaryKey().defaultRandom(),
  faultId: uuid('fault_id')
    .notNull()
    .references(() => faults.id, { onDelete: 'cascade' }),
  authorId: uuid('author_id')
    .notNull()
    .references(() => users.id),
  body: text('body').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export type Fault = typeof faults.$inferSelect
export type NewFault = typeof faults.$inferInsert
export type FaultComment = typeof faultComments.$inferSelect
export type NewFaultComment = typeof faultComments.$inferInsert
export type FaultStatus = (typeof faultStatusEnum.enumValues)[number]
export type FaultType = (typeof faultTypeEnum.enumValues)[number]
