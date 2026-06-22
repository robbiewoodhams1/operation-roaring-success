import { requireRole } from '@roaring/auth/server'
import { db, users } from '@roaring/db'
import { eq } from 'drizzle-orm'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { UserEdit } from './user-edit'
import { DeletePendingButton } from './delete-pending-button'

const roleColours: Record<string, string> = {
  admin: 'bg-red-100 text-red-800 border-red-200',
  manager: 'bg-purple-100 text-purple-800 border-purple-200',
  director: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  team_leader: 'bg-blue-100 text-blue-800 border-blue-200',
  agent: 'bg-green-100 text-green-800 border-green-200',
  sales: 'bg-yellow-100 text-yellow-800 border-yellow-200',
}

export default async function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const currentUser = await requireRole('admin')

  const result = await db.select().from(users).where(eq(users.id, id)).limit(1)
  const user = result[0]
  if (!user || user.tenantId !== currentUser.tenantId) notFound()

  const isSelf = user.id === currentUser.id

  return (
    <div className="p-6 w-full">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/users">
          <ArrowLeft className="size-4" />
        </Link>
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold">{user.fullName}</h1>
            <Badge variant="outline" className={roleColours[user.role] ?? ''}>
              {user.role.replace('_', ' ')}
            </Badge>
            {user.approvalStatus === 'pending' ? (
              <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-200">
                Pending
              </Badge>
            ) : (
              !user.isActive && (
                <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200">
                  Suspended
                </Badge>
              )
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1">{user.email}</p>
        </div>
      </div>

      {!isSelf && user.approvalStatus === 'pending' && (
        <div className="border border-red-200 rounded-lg overflow-hidden mb-6">
          <div className="px-4 py-3 border-b border-red-200 bg-red-50">
            <h2 className="text-sm font-medium text-red-800">Danger zone</h2>
          </div>
          <div className="px-4 py-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Delete pending invite</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Removes this user so you can re-invite them with a fresh link.
              </p>
            </div>
            <DeletePendingButton userId={user.id} />
          </div>
        </div>
      )}

      <UserEdit user={user} currentUserId={currentUser.id} />
    </div>
  )
}
