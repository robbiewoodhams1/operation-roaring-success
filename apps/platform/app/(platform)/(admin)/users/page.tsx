import { requireRole } from '@roaring/auth/server'
import { db, users } from '@roaring/db'
import { eq } from 'drizzle-orm'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default async function UsersPage() {
  const currentUser = await requireRole('admin')

  const allUsers = await db.query.users.findMany({
    where: eq(users.tenantId, currentUser.tenantId),
    orderBy: (users, { desc }) => [desc(users.createdAt)],
  })

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold">Users</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage team access and roles</p>
        </div>
        <Link href="/users/new">
          <Button>Invite user</Button>
        </Link>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Name</th>
              <th className="text-left px-4 py-3 font-medium">Email</th>
              <th className="text-left px-4 py-3 font-medium">Role</th>
              <th className="text-left px-4 py-3 font-medium">Status</th>
              <th className="text-left px-4 py-3 font-medium">Joined</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {allUsers.map((user) => (
              <tr key={user.id} className="hover:bg-muted/30">
                <td className="px-4 py-3 font-medium">{user.fullName}</td>
                <td className="px-4 py-3 text-muted-foreground">{user.email}</td>
                <td className="px-4 py-3">
                  <span className="capitalize">{user.role.replace('_', ' ')}</span>
                </td>
                <td className="px-4 py-3">
                  <StatusBadge approvalStatus={user.approvalStatus} isActive={user.isActive} />
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {new Date(user.createdAt).toLocaleDateString('en-GB')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {allUsers.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            No users yet. Invite your first team member.
          </div>
        )}
      </div>
    </div>
  )
}

function StatusBadge({ approvalStatus, isActive }: { approvalStatus: string; isActive: boolean }) {
  if (!isActive && approvalStatus === 'pending') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
        Pending setup
      </span>
    )
  }
  if (!isActive) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
        Inactive
      </span>
    )
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
      Active
    </span>
  )
}
