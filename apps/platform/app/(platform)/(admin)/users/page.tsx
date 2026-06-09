import { requireRole } from '@roaring/auth/server'
import { db, users } from '@roaring/db'
import { eq, desc } from 'drizzle-orm'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { UsersTable } from './users-table'

export default async function UsersPage() {
  const currentUser = await requireRole('admin')

  const allUsers = await db
    .select()
    .from(users)
    .where(eq(users.tenantId, currentUser.tenantId))
    .orderBy(desc(users.createdAt))

  return (
    <div className="px-6 mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold">Users</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage team access and roles</p>
        </div>
        <Link href="/users/new">
          <Button>Invite user</Button>
        </Link>
      </div>
      <UsersTable users={allUsers} />
    </div>
  )
}
