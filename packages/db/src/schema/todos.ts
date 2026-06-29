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

export const todoStatusEnum = appSchema.enum('todo_status', [
  'not_started',
  'in_progress',
  'completed',
  'cancelled',
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
  status: todoStatusEnum('status').notNull().default('not_started'),
  linkType: todoLinkTypeEnum('link_type'),
  linkId: uuid('link_id'),
  linkLabel: text('link_label'),
  createdBy: uuid('created_by')
    .notNull()
    .references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const todoComments = appSchema.table('todo_comments', {
  id: uuid('id').primaryKey().defaultRandom(),
  todoId: uuid('todo_id')
    .notNull()
    .references(() => todos.id, { onDelete: 'cascade' }),
  authorId: uuid('author_id')
    .notNull()
    .references(() => users.id),
  body: text('body').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export type Todo = typeof todos.$inferSelect
export type TodoComment = typeof todoComments.$inferSelect
export type TodoPriority = (typeof todoPriorityEnum.enumValues)[number]
export type TodoStatus = (typeof todoStatusEnum.enumValues)[number]
export type TodoLinkType = (typeof todoLinkTypeEnum.enumValues)[number]
