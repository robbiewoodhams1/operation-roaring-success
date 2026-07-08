import { db, auditLogs, users } from '@roaring/db'
import { and, eq, inArray, or, desc, sql, type SQL } from 'drizzle-orm'
import type { AuditLog } from '@/lib/types'

// A set of audit-log rows to fetch for one table: either specific record ids,
// or every row whose old/new data references a parent record (this also
// catches rows for children that have since been deleted, e.g. comments).
export type HistoryTarget =
  | { table: string; ids: string[] }
  | { table: string; parentField: string; parentId: string }

export async function getChangeHistory(
  targets: HistoryTarget[]
): Promise<{ logs: AuditLog[]; userNames: Record<string, string> }> {
  const conditions: SQL[] = []
  for (const t of targets) {
    if ('ids' in t) {
      if (t.ids.length === 0) continue
      const condition = and(eq(auditLogs.tableName, t.table), inArray(auditLogs.recordId, t.ids))
      if (condition) conditions.push(condition)
    } else {
      const condition = and(
        eq(auditLogs.tableName, t.table),
        sql`(${auditLogs.oldData} ->> ${t.parentField} = ${t.parentId} OR ${auditLogs.newData} ->> ${t.parentField} = ${t.parentId})`
      )
      if (condition) conditions.push(condition)
    }
  }

  if (conditions.length === 0) return { logs: [], userNames: {} }

  const logs = await db
    .select()
    .from(auditLogs)
    .where(or(...conditions))
    .orderBy(desc(auditLogs.changedAt))

  const userIds = [...new Set(logs.map((l) => l.changedBy).filter(Boolean))] as string[]
  const userNames: Record<string, string> = {}
  if (userIds.length > 0) {
    const userResults = await db
      .select({ id: users.id, fullName: users.fullName })
      .from(users)
      .where(inArray(users.id, userIds))
    for (const u of userResults) {
      userNames[u.id] = u.fullName
    }
  }

  return { logs, userNames }
}
