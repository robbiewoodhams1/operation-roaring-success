import { boolean, date, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { appSchema, tenants } from './tenants'
import { deals } from './deals'

export const wcOutcomeEnum = appSchema.enum('wc_outcome', [
  'call_back',
  'answered',
  'no_answer',
  'cancelled',
])

export const provisioningStatusEnum = appSchema.enum('provisioning_status', [
  'not_started',
  'broadband_applied',
  'whc_applied',
  'broadband_and_whc_applied',
  'live',
  'failed',
])

export const provisioningInstallTypeEnum = appSchema.enum('provisioning_install_type', [
  'new_install',
  'migration',
])

export const provisioning = appSchema.table('provisioning', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id),
  dealId: uuid('deal_id')
    .notNull()
    .references(() => deals.id),
  status: provisioningStatusEnum('status').notNull().default('not_started'),
  wc1Outcome: wcOutcomeEnum('wc1_outcome'),
  wc1Comments: text('wc1_comments'),
  wc2Outcome: wcOutcomeEnum('wc2_outcome'),
  wc2Comments: text('wc2_comments'),
  routerDispatched: boolean('router_dispatched').notNull().default(false),
  routerDispatchRef: text('router_dispatch_ref'),
  routerTrackingNumber: text('router_tracking_number'),
  bbAppliedFor: text('bb_applied_for'),
  bbOrderRef: text('bb_order_ref'),
  whcReference: text('whc_reference'),
  installType: provisioningInstallTypeEnum('install_type'),
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
