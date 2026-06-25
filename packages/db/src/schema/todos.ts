import { boolean, pgEnum, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { appSchema, tenants } from './tenants'
import { users } from './users'

export const todoPriorityEnum = appSchema.enum('todo_priority', [
  'asap',
  'today',
  'tomorrow',
  'this_week',
  'no_rush',
])

export const todoLinkTypeEnum = appSchema.enum('todo_link_type', [
  'customer',
  'provisioning',
  'fault',
  'complaint',
  'debt',
  'deal',
])

export const todos = appSchema.table('todos', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id),
  assignedTo: uuid('assigned_to')
    .notNull()
    .references(() => users.id),
  assignedBy: uuid('assigned_by').references(() => users.id),
  title: text('title').notNull(),
  description: text('description'),
  priority: todoPriorityEnum('priority').notNull().default('today'),
  done: boolean('done').notNull().default(false),
  doneAt: timestamp('done_at', { withTimezone: true }),
  linkType: todoLinkTypeEnum('link_type'),
  linkId: uuid('link_id'),
  linkLabel: text('link_label'),
  createdBy: uuid('created_by')
    .notNull()
    .references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export type Todo = typeof todos.$inferSelect
export type NewTodo = typeof todos.$inferInsert
export type TodoPriority = (typeof todoPriorityEnum.enumValues)[number]
export type TodoLinkType = (typeof todoLinkTypeEnum.enumValues)[number]
