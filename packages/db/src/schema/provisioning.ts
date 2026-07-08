import { date, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { appSchema, tenants } from './tenants'
import { deals } from './deals'
import { customers } from './customers'

export const wcOutcomeEnum = appSchema.enum('wc_outcome', [
  'call_back',
  'answered',
  'no_answer',
  'cancelled',
])

export const provisioningStatusEnum = appSchema.enum('provisioning_status', [
  'not_started',
  'in_progress',
  'broadband_applied',
  'whc_applied',
  'broadband_and_whc_applied',
  'live',
  'failed',
  'mpf_broadband_applied',
  'mpf_voice_applied',
])

export const routerDispatchedEnum = appSchema.enum('router_dispatched', ['yes', 'no', 'not_needed'])

export const provisioning = appSchema.table('provisioning', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id),
  dealId: uuid('deal_id').references(() => deals.id), // nullable — no longer notNull
  customerId: uuid('customer_id').references(() => customers.id), // new — direct customer link
  status: provisioningStatusEnum('status').notNull().default('not_started'),

  // Welcome calls
  wc1Outcome: wcOutcomeEnum('wc1_outcome'),
  wc1Comments: text('wc1_comments'),
  wc2Outcome: wcOutcomeEnum('wc2_outcome'),
  wc2Comments: text('wc2_comments'),
  wc3Outcome: wcOutcomeEnum('wc3_outcome'),
  wc3Comments: text('wc3_comments'),

  // Router
  routerDispatched: routerDispatchedEnum('router_dispatched').notNull().default('no'),
  routerOrderedDate: date('router_ordered_date'),
  routerDispatchRef: text('router_dispatch_ref'),
  routerTrackingNumber: text('router_tracking_number'),

  // Order
  proposedLiveDate: date('proposed_live_date'),
  dateOrdered: date('date_ordered'),
  orderComments: text('order_comments'),
  orderFaultRef: text('order_fault_ref'),
  provisioner: text('provisioner'),
  lastCheckedAt: timestamp('last_checked_at', { withTimezone: true }),
  lastCheckedBy: text('last_checked_by'),

  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export type Provisioning = typeof provisioning.$inferSelect
export type NewProvisioning = typeof provisioning.$inferInsert
export type ProvisioningStatus = (typeof provisioningStatusEnum.enumValues)[number]
export type WcOutcome = (typeof wcOutcomeEnum.enumValues)[number]
export type RouterDispatched = (typeof routerDispatchedEnum.enumValues)[number]
