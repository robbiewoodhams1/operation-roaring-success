import { redirect } from 'next/navigation'
import { createClient } from './server'
import { db } from '@roaring/db'
import { users } from '@roaring/db'
import { eq } from 'drizzle-orm'
import type { AuthUser, UserRole } from './types'

async function getAppUser(authId: string): Promise<AuthUser | null> {
  const user = await db.query.users.findFirst({
    where: eq(users.id, authId),
  })

  if (!user) return null

  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    tenantId: user.tenantId,
    approvalStatus: user.approvalStatus,
  }
}

export async function getUser(): Promise<AuthUser | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null
  return getAppUser(user.id)
}

export async function requireUser(): Promise<AuthUser> {
  const user = await getUser()
  if (!user) redirect('/login')
  if (user.approvalStatus === 'pending') redirect('/pending-approval')
  if (user.approvalStatus === 'rejected') redirect('/rejected')
  if (!user) redirect('/login')
  return user
}

export async function requireRole(...roles: UserRole[]): Promise<AuthUser> {
  const user = await requireUser()
  if (!roles.includes(user.role)) redirect('/unauthorized')
  return user
}
