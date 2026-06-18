'use client'

import { useRouter } from 'next/navigation'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { type User } from '@/lib/types'

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

export function UsersTable({ users }: { users: User[] }) {
  const router = useRouter()

  return (
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
          {users.map((user) => (
            <TableRow
              key={user.id}
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => router.push(`/users/${user.id}`)}
            >
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

      {users.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          No users yet. Invite your first team member.
        </div>
      )}
    </div>
  )
}
