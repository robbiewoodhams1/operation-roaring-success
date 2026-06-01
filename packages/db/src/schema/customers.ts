import { pgEnum, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { appSchema, tenants } from './tenants'
import { users } from './users'

export const customerTypeEnum = appSchema.enum('customer_type', ['residential', 'business'])

export const customerStatusEnum = appSchema.enum('customer_status', [
  'prospect',
  'active',
  'at_risk',
  'churned',
])

export const customers = appSchema.table('customers', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id),
  accountNumber: text('account_number').notNull().unique(),
  type: customerTypeEnum('type').notNull().default('business'),
  companyName: text('company_name'),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  mobile: text('mobile'),
  email: text('email'),
  addressLine1: text('address_line_1'),
  addressLine2: text('address_line_2'),
  addressLine3: text('address_line_3'),
  addressLine4: text('address_line_4'),
  postcode: text('postcode'),
  status: customerStatusEnum('status').notNull().default('prospect'),
  assignedTo: uuid('assigned_to').references(() => users.id),
  createdBy: uuid('created_by').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export type Customer = typeof customers.$inferSelect
export type NewCustomer = typeof customers.$inferInsert
export type CustomerType = (typeof customerTypeEnum.enumValues)[number]
export type CustomerStatus = (typeof customerStatusEnum.enumValues)[number]
