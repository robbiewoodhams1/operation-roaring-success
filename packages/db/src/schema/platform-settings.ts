import { boolean, jsonb, timestamp, uuid } from 'drizzle-orm/pg-core'
import { appSchema } from './tenants'

/**
 * Dashboard-editable overrides for the values in `app.config.json`.
 *
 * Exactly one row ever exists — the boolean primary key defaults to true and is
 * checked, so a second insert conflicts. `settings` holds a partial config
 * object that is deep-merged over the JSON defaults at read time, so keys added
 * to the JSON later appear without touching this table.
 */
export const platformSettings = appSchema.table('platform_settings', {
  id: boolean('id').primaryKey().default(true),
  settings: jsonb('settings').notNull().default({}),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  updatedBy: uuid('updated_by'),
})

export type PlatformSettings = typeof platformSettings.$inferSelect
export type NewPlatformSettings = typeof platformSettings.$inferInsert
