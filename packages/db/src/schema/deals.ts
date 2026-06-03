import {
  boolean,
  date,
  integer,
  jsonb,
  numeric,
  pgEnum,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'
import { appSchema, tenants } from './tenants'
import { customers } from './customers'

export const dealTypeEnum = appSchema.enum('deal_type', ['business', 'residential'])
export const dealStatusEnum = appSchema.enum('deal_status', ['pending', 'live', 'cancelled'])
export const lineConfigurationEnum = appSchema.enum('line_configuration', [
  'single',
  'multi',
  'mpf',
])
export const voiceOptionTypeEnum = appSchema.enum('voice_option_type', ['whc', 'nfon', 'mpf'])
export const installTypeEnum = appSchema.enum('install_type', ['new_install', 'migration'])
export const billingTypeEnum = appSchema.enum('billing_type', ['paper', 'email'])
export const paymentMethodEnum = appSchema.enum('payment_method', ['dd', 'mandate', 'card_bacs'])
export const contractLengthEnum = appSchema.enum('contract_length', [
  '24_months',
  '36_months',
  '48_months',
  'other',
])
export const welcomeCallEnum = appSchema.enum('welcome_call', ['am', 'pm'])

export const deals = appSchema.table('deals', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id),
  customerId: uuid('customer_id')
    .notNull()
    .references(() => customers.id),
  salesAgent: text('sales_agent').notNull(),
  closingAgent: text('closing_agent').notNull(),
  dealType: dealTypeEnum('deal_type').notNull(),
  status: dealStatusEnum('status').notNull().default('pending'),
  tradingAddress: text('trading_address'),
  softFacts: text('soft_facts'),
  dealDate: date('deal_date').notNull(),
  welcomeCall: welcomeCallEnum('welcome_call'),
  createdBy: uuid('created_by').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const dealServices = appSchema.table('deal_services', {
  id: uuid('id').primaryKey().defaultRandom(),
  dealId: uuid('deal_id')
    .notNull()
    .references(() => deals.id, { onDelete: 'cascade' }),
  lineChecked: boolean('line_checked').notNull().default(false),
  connectionFee: numeric('connection_fee', { precision: 10, scale: 2 }),
  broadbandType: text('broadband_type'),
  installType: installTypeEnum('install_type'),
  ontSerialNumber: text('ont_serial_number'),
  normalSpeed: text('normal_speed'),
  minSpeed: text('min_speed'),
  maxSpeed: text('max_speed'),
  voiceRequired: boolean('voice_required').notNull().default(false),
  currentVoiceType: text('current_voice_type'),
  lineConfiguration: lineConfigurationEnum('line_configuration'),
  numLicenses: integer('num_licenses'),
  voiceOption: voiceOptionTypeEnum('voice_option'),
  callTariff: text('call_tariff'),
  existingHandsets: text('existing_handsets'),
  intlPackage: text('intl_package'),
  intlLocation: text('intl_location'),
  premiumPackage: text('premium_package'),
  equipment: jsonb('equipment'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const dealPricing = appSchema.table('deal_pricing', {
  id: uuid('id').primaryKey().defaultRandom(),
  dealId: uuid('deal_id')
    .notNull()
    .references(() => deals.id, { onDelete: 'cascade' }),
  bundlePrice: numeric('bundle_price', { precision: 10, scale: 2 }).notNull(),
  wholesaleCost: numeric('wholesale_cost', { precision: 10, scale: 2 }).notNull(),
  monthlyGp: numeric('monthly_gp', { precision: 10, scale: 2 }).notNull(),
  connectionFee: numeric('connection_fee', { precision: 10, scale: 2 }),
  billAmountLosingSupplier: numeric('bill_amount_losing_supplier', { precision: 10, scale: 2 }),
  contractLength: contractLengthEnum('contract_length'),
  contractLengthOther: text('contract_length_other'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const dealBilling = appSchema.table('deal_billing', {
  id: uuid('id').primaryKey().defaultRandom(),
  dealId: uuid('deal_id')
    .notNull()
    .references(() => deals.id, { onDelete: 'cascade' }),
  billingType: billingTypeEnum('billing_type'),
  paymentMethod: paymentMethodEnum('payment_method'),
  phoneProvider: text('phone_provider'),
  broadbandProvider: text('broadband_provider'),
  invoiceName: text('invoice_name'),
  bankBranch: text('bank_branch'),
  sortCode: text('sort_code'),
  accountNumber: text('account_number'),
  bankChecked: boolean('bank_checked').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export type Deal = typeof deals.$inferSelect
export type NewDeal = typeof deals.$inferInsert
export type DealService = typeof dealServices.$inferSelect
export type DealPricing = typeof dealPricing.$inferSelect
export type DealBilling = typeof dealBilling.$inferSelect
export type DealStatus = (typeof dealStatusEnum.enumValues)[number]
export type DealType = (typeof dealTypeEnum.enumValues)[number]
