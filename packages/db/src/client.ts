import { assertCrmEnvironment } from '@roaring/config/environments'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set')
}

// Must run before the pool is created: refuses a DATABASE_URL (or any other
// Supabase variable) that doesn't belong to the project CRM_ENV names.
assertCrmEnvironment()

const connectionString = process.env.DATABASE_URL

declare global {
  var _pgClient: ReturnType<typeof postgres> | undefined
  var _db: ReturnType<typeof drizzle> | undefined
}

const client =
  globalThis._pgClient ??
  postgres(connectionString, {
    prepare: false,
    max: 10,
  })

export const db = globalThis._db ?? drizzle(client, { schema })

if (process.env.NODE_ENV !== 'production') {
  globalThis._pgClient = client
  globalThis._db = db
}

export type Database = typeof db
