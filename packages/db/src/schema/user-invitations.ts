// packages/db/src/schema/user-invitations.ts
import { text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { appSchema, tenants } from './tenants'
import { userRoleEnum } from './users'

export const invitationStatusEnum = appSchema.enum('invitation_status', [
  'pending',
  'accepted',
  'expired',
])

export const userInvitations = appSchema.table('user_invitations', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id),
  invitedBy: uuid('invited_by').notNull(),
  invitedByEmail: text('invited_by_email').notNull(),
  invitedByName: text('invited_by_name').notNull(),
  email: text('email').notNull(),
  role: userRoleEnum('role').notNull(),
  token: text('token').notNull().unique(),
  status: invitationStatusEnum('status').notNull().default('pending'),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export type UserInvitation = typeof userInvitations.$inferSelect
export type NewUserInvitation = typeof userInvitations.$inferInsert
export type InvitationStatus = (typeof invitationStatusEnum.enumValues)[number]
