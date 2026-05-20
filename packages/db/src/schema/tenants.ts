import { pgSchema, boolean, text, timestamp, uuid } from 'drizzle-orm/pg-core'

export const appSchema = pgSchema('app')

export const tenants = appSchema.table('tenants', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  databaseUrl: text('database_url').notNull(),
  plan: text('plan').notNull().default('internal'),
  stripeCustomerId: text('stripe_customer_id'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export type Tenant = typeof tenants.$inferSelect
export type NewTenant = typeof tenants.$inferInsert
