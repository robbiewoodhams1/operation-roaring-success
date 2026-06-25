import { pgEnum, timestamp, uuid } from 'drizzle-orm/pg-core'
import { appSchema, tenants } from './tenants'
import { users } from './users'
import { provisioning } from './provisioning'

export const transferCeaseTypeEnum = appSchema.enum('transfer_cease_type', [
  'cease',
  'transfer',
  'historical_transfer',
  'standard_cease',
  'standard_transfer',
])

export const transferCeaseStatusEnum = appSchema.enum('transfer_cease_status', [
  'open',
  'in_progress',
  'completed',
  'cancelled',
])

export const transferCeases = appSchema.table('transfer_ceases', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id),
  provisioningId: uuid('provisioning_id').references(() => provisioning.id),
  assignedTo: uuid('assigned_to').references(() => users.id),
  type: transferCeaseTypeEnum('type').notNull(),
  status: transferCeaseStatusEnum('status').notNull().default('open'),
  openedAt: timestamp('opened_at', { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  createdBy: uuid('created_by')
    .notNull()
    .references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const transferCeaseComments = appSchema.table('transfer_cease_comments', {
  id: uuid('id').primaryKey().defaultRandom(),
  transferCeaseId: uuid('transfer_cease_id')
    .notNull()
    .references(() => transferCeases.id, { onDelete: 'cascade' }),
  authorId: uuid('author_id')
    .notNull()
    .references(() => users.id),
  body: uuid('body').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export type TransferCease = typeof transferCeases.$inferSelect
export type TransferCeaseComment = typeof transferCeaseComments.$inferSelect
export type TransferCeaseType = (typeof transferCeaseTypeEnum.enumValues)[number]
export type TransferCeaseStatus = (typeof transferCeaseStatusEnum.enumValues)[number]
