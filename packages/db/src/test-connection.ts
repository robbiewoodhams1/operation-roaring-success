// $env:DATABASE_URL="db-url-here"; pnpm --filter @roaring/db exec tsx src/test-connection.ts

import { db } from './client'
import { tenants } from './schema'

async function testConnection() {
  try {
    const result = await db.select().from(tenants)
    console.log('✅ Connected successfully')
    console.log('Tenants:', result)
  } catch (error) {
    console.error('❌ Connection failed:', error)
  } finally {
    process.exit(0)
  }
}

testConnection()
