import { requireRole } from '@roaring/auth/server'
import { db, users } from '@roaring/db'
import { eq } from 'drizzle-orm'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'

export default async function UsersPage() {
  const currentUser = await requireRole('admin')

  const allUsers = await db.query.users.findMany({
    where: eq(users.tenantId, currentUser.tenantId),
    orderBy: (users, { desc }) => [desc(users.createdAt)],
  })

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

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Joined</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {allUsers.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">{user.fullName}</TableCell>
                <TableCell className="text-muted-foreground">{user.email}</TableCell>
                <TableCell className="capitalize">{user.role.replace('_', ' ')}</TableCell>
                <TableCell>
                  <StatusBadge approvalStatus={user.approvalStatus} isActive={user.isActive} />
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {new Date(user.createdAt).toLocaleDateString('en-GB')}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

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
      <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-200">
        Pending setup
      </Badge>
    )
  }
  if (!isActive) {
    return (
      <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200">
        Inactive
      </Badge>
    )
  }
  return (
    <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">
      Active
    </Badge>
  )
}
