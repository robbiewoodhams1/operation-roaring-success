import { boolean, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { appSchema, tenants } from './tenants'
import { users } from './users'

export const teams = appSchema.table('teams', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id),
  name: text('name').notNull(),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

/**
 * Team membership history, maintained by a trigger whenever users.team_id
 * changes. Read-only from the app's point of view.
 */
export const userTeamMemberships = appSchema.table('user_team_memberships', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id),
  teamId: uuid('team_id')
    .notNull()
    .references(() => teams.id),
  validFrom: timestamp('valid_from', { withTimezone: true }).notNull().defaultNow(),
  validTo: timestamp('valid_to', { withTimezone: true }),
  changedBy: uuid('changed_by').references(() => users.id),
})

export type Team = typeof teams.$inferSelect
export type NewTeam = typeof teams.$inferInsert
