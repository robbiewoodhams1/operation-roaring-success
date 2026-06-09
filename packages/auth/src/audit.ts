import { sql } from 'drizzle-orm'

export async function setAuditUser(tx: { execute: (query: any) => Promise<any> }, userId: string) {
  await tx.execute(sql`SELECT set_config('app.current_user_id', ${userId}, true)`)
}
