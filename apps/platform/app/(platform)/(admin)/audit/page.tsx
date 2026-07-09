import { requireUser } from '@roaring/auth'
import { db, auditLogs, users } from '@roaring/db'
import { desc, eq } from 'drizzle-orm'
import { AuditClient } from './audit-client'
import { redirect } from 'next/navigation'

export default async function AuditPage() {
  const user = await requireUser()

  if (user.role !== 'admin') {
    redirect('/home')
  }

  const logs = await db
    .select({
      id: auditLogs.id,
      tableName: auditLogs.tableName,
      recordId: auditLogs.recordId,
      action: auditLogs.action,
      oldData: auditLogs.oldData,
      newData: auditLogs.newData,
      changedBy: auditLogs.changedBy,
      changedAt: auditLogs.changedAt,
    })
    .from(auditLogs)
    .orderBy(desc(auditLogs.changedAt))

  // Get user names for changed_by IDs
  const userIds = [...new Set(logs.map((l) => l.changedBy).filter(Boolean))] as string[]

  const userNames: Record<string, string> = {}
  if (userIds.length > 0) {
    const userResults = await db
      .select({ id: users.id, fullName: users.fullName })
      .from(users)
      .where(eq(users.tenantId, user.tenantId))

    for (const u of userResults) {
      userNames[u.id] = u.fullName
    }
  }

  return <AuditClient logs={logs} userNames={userNames} />
}
