import { pgEnum, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { appSchema, tenants } from './tenants'
import { users } from './users'
import { provisioning } from './provisioning'

export const complaintStatusEnum = appSchema.enum('complaint_status', [
  'open',
  'investigating',
  'pending_customer',
  'pending_chess',
  'pending_tech',
  'pending_recorded_call',
  'ofcom',
  'cisas',
  'scheduled_call_back',
  'closed',
])

export const complaintTypeEnum = appSchema.enum('complaint_type', [
  'bb',
  'line',
  'upgrade',
  'dfb',
  'provisioning',
  'mobile',
  'billing',
  'service',
  'other',
])

export const complaints = appSchema.table('complaints', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id),
  provisioningId: uuid('provisioning_id').references(() => provisioning.id),
  assignedTo: uuid('assigned_to').references(() => users.id),
  title: text('title').notNull(),
  type: complaintTypeEnum('type').notNull(),
  status: complaintStatusEnum('status').notNull().default('open'),
  ticketRef: text('ticket_ref'),
  ticketRaisedAt: timestamp('ticket_raised_at', { withTimezone: true }),
  openedAt: timestamp('opened_at', { withTimezone: true }).notNull().defaultNow(),
  closedAt: timestamp('closed_at', { withTimezone: true }),
  createdBy: uuid('created_by')
    .notNull()
    .references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const complaintComments = appSchema.table('complaint_comments', {
  id: uuid('id').primaryKey().defaultRandom(),
  complaintId: uuid('complaint_id')
    .notNull()
    .references(() => complaints.id, { onDelete: 'cascade' }),
  authorId: uuid('author_id')
    .notNull()
    .references(() => users.id),
  body: text('body').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export type Complaint = typeof complaints.$inferSelect
export type NewComplaint = typeof complaints.$inferInsert
export type ComplaintComment = typeof complaintComments.$inferSelect
export type ComplaintStatus = (typeof complaintStatusEnum.enumValues)[number]
export type ComplaintType = (typeof complaintTypeEnum.enumValues)[number]
