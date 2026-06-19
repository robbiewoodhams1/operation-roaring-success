import { boolean, date, numeric, pgEnum, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { appSchema, tenants } from './tenants'
import { users } from './users'
import { provisioning } from './provisioning'

export const debtOutcomeEnum = appSchema.enum('debt_outcome', [
  'payment',
  'payment_plan',
  'no_answer',
  'invalid_contact_details',
  'refused',
  'call_back',
  'left_voicemail',
  'promised_payment',
  'free_bill',
  'taken_by_dd_already',
  'deceased',
  'not_in_live_list',
  'needs_investigating',
  'active_dd',
  'part_payment',
  'take_on_dd',
  'uncollectable',
])

export const debtPaymentTypeEnum = appSchema.enum('debt_payment_type', [
  'bacs',
  'card',
  'dd',
  'cheque',
  'eft',
])

export const debts = appSchema.table('debts', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id),
  provisioningId: uuid('provisioning_id').references(() => provisioning.id),
  assignedTo: uuid('assigned_to').references(() => users.id),
  title: text('title').notNull(),
  outcome: debtOutcomeEnum('outcome'),
  totalOwed: numeric('total_owed', { precision: 10, scale: 2 }).notNull().default('0'),
  paymentTried: boolean('payment_tried').notNull().default(false),
  paymentType: debtPaymentTypeEnum('payment_type'),
  dateOfPayment: date('date_of_payment'),
  openedAt: timestamp('opened_at', { withTimezone: true }).notNull().defaultNow(),
  closedAt: timestamp('closed_at', { withTimezone: true }),
  createdBy: uuid('created_by')
    .notNull()
    .references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const debtComments = appSchema.table('debt_comments', {
  id: uuid('id').primaryKey().defaultRandom(),
  debtId: uuid('debt_id')
    .notNull()
    .references(() => debts.id, { onDelete: 'cascade' }),
  authorId: uuid('author_id')
    .notNull()
    .references(() => users.id),
  body: text('body').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export type Debt = typeof debts.$inferSelect
export type NewDebt = typeof debts.$inferInsert
export type DebtComment = typeof debtComments.$inferSelect
export type DebtOutcome = (typeof debtOutcomeEnum.enumValues)[number]
export type DebtPaymentType = (typeof debtPaymentTypeEnum.enumValues)[number]
