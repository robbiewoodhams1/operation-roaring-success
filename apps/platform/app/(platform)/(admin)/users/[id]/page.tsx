import { requireRole } from '@roaring/auth/server'
import { db, users } from '@roaring/db'
import { eq } from 'drizzle-orm'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { UserEdit } from './user-edit'

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

  return (
    <div className="p-6 max-w-2xl">
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
            {!user.isActive && (
              <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200">
                Suspended
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1">{user.email}</p>
        </div>
      </div>

      <UserEdit user={user} currentUserId={currentUser.id} />
    </div>
  )
}
