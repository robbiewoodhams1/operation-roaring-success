import { date, integer, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { appSchema } from './tenants'
import { provisioning } from './provisioning'

export const serviceTypeEnum = appSchema.enum('service_type', ['bb', 'whc', 'nfon', 'mpf'])

export const serviceStatusEnum = appSchema.enum('service_status', [
  'not_applied',
  'applied',
  'delayed',
  'cancelled',
  'live',
])

export const cancelledByTypeEnum = appSchema.enum('cancelled_by_type', [
  'customer',
  'bt_wholesale',
  'openreach',
  'us',
])

export const provisioningServices = appSchema.table('provisioning_services', {
  id: uuid('id').primaryKey().defaultRandom(),
  provisioningId: uuid('provisioning_id')
    .notNull()
    .references(() => provisioning.id, { onDelete: 'cascade' }),
  serviceType: serviceTypeEnum('service_type').notNull(),
  status: serviceStatusEnum('status').notNull().default('not_applied'),
  attempt: integer('attempt').notNull().default(1),
  dateOrdered: date('date_ordered'),
  liveDate: date('live_date'),
  lastCheckedAt: date('last_checked_at'),
  reference: text('reference'),
  cancelledDate: date('cancelled_date'),
  cancelledBy: cancelledByTypeEnum('cancelled_by'),
  cancellationReason: text('cancellation_reason'),
  delayedDate: date('delayed_date'),
  presumedSolveDate: date('presumed_solve_date'),
  delayReason: text('delay_reason'),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export type ProvisioningService = typeof provisioningServices.$inferSelect
export type NewProvisioningService = typeof provisioningServices.$inferInsert
export type ServiceType = (typeof serviceTypeEnum.enumValues)[number]
export type ServiceStatus = (typeof serviceStatusEnum.enumValues)[number]
