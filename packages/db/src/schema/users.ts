// packages/db/src/schema/users.ts
import { boolean, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { appSchema, tenants } from './tenants'

export const userRoleEnum = appSchema.enum('user_role', [
  'agent',
  'team_leader',
  'manager',
  'director',
  'admin',
])

export const approvalStatusEnum = appSchema.enum('approval_status', [
  'pending',
  'approved',
  'rejected',
])

export const users = appSchema.table('users', {
  id: uuid('id').primaryKey(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id),
  email: text('email').notNull(),
  fullName: text('full_name').notNull(),
  role: userRoleEnum('role').notNull().default('agent'),
  approvalStatus: approvalStatusEnum('approval_status').notNull().default('pending'),
  isActive: boolean('is_active').notNull().default(true),
  phone: text('phone'),
  department: text('department'),
  team: text('team'),
  avatarUrl: text('avatar_url'),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
export type UserRole = (typeof userRoleEnum.enumValues)[number]
export type ApprovalStatus = (typeof approvalStatusEnum.enumValues)[number]
