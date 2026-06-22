import { redirect } from 'next/navigation'
import { createClient, createAdminClient } from './server'
import { db, users, auditLogs } from '@roaring/db'
import { eq } from 'drizzle-orm'
import type { AuthUser, UserRole } from './types'

async function getAppUser(authId: string): Promise<AuthUser | null> {
  const result = await db.select().from(users).where(eq(users.id, authId)).limit(1)

  const user = result[0]
  if (!user) return null

  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    tenantId: user.tenantId,
    approvalStatus: user.approvalStatus,
    isActive: user.isActive,
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
  if (!user.isActive) {
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect('/login?suspended=true')
  }
  return user
}

export async function requireRole(...roles: UserRole[]): Promise<AuthUser> {
  const user = await requireUser()
  if (!roles.includes(user.role)) redirect('/unauthorised')
  return user
}

export async function resendInvite(email: string) {
  await requireRole('admin')
  const supabase = createAdminClient()

  const { error } = await supabase.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/confirm`,
  })

  if (error) {
    console.error('Resend invite error:', error)
    return { success: false, error: error.message }
  }

  return { success: true, error: null }
}

export async function inviteUser({
  email,
  fullName,
  role,
  tenantId,
  department,
  team,
  invitedById,
  invitedByEmail,
  invitedByName,
}: {
  email: string
  fullName: string
  role: UserRole
  tenantId: string
  department?: string
  team?: string
  invitedById: string
  invitedByEmail: string
  invitedByName: string
}): Promise<{ success: boolean; error: string | null }> {
  // Step 1 — create auth.users entry and send invite email via Supabase
  const supabase = await createAdminClient()

  const { data: authUser, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(
    email,
    {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/confirm`,
      data: {
        full_name: fullName,
        role,
        tenant_id: tenantId,
      },
    }
  )

  if (inviteError) {
    console.error('Supabase invite error:', inviteError)
    return { success: false, error: inviteError.message }
  }

  if (!authUser.user) {
    return { success: false, error: 'Failed to create user' }
  }

  // Step 2 — create app.users row in pending state
  try {
    await db.insert(users).values({
      id: authUser.user.id,
      tenantId,
      email,
      fullName,
      role,
      approvalStatus: 'pending',
      isActive: false,
      department: department ?? null,
      team: team ?? null,
    })
  } catch (err) {
    // If app.users insert fails, we should ideally roll back the auth user
    // For now log and return error — TODO: add cleanup
    console.error('Failed to insert app.users row:', err)
    return { success: false, error: 'Failed to create user profile' }
  }

  // Step 3 — log the invite in audit_logs
  await db.insert(auditLogs).values({
    tableName: 'user_invitations',
    recordId: authUser.user.id,
    action: 'INSERT',
    newData: { email, role, fullName },
    changedBy: invitedById,
  })

  return { success: true, error: null }
}

export async function confirmInvite(
  code: string
): Promise<{ success: boolean; error: string | null }> {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error || !data.user) {
    return { success: false, error: error?.message ?? 'Invalid link' }
  }

  await db
    .update(users)
    .set({
      approvalStatus: 'approved',
      isActive: true,
    })
    .where(eq(users.id, data.user.id))

  return { success: true, error: null }
}

export async function activateUser(
  userId: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    await db
      .update(users)
      .set({
        approvalStatus: 'approved',
        isActive: true,
      })
      .where(eq(users.id, userId))

    return { success: true, error: null }
  } catch (err) {
    console.error('Failed to activate user:', err)
    return { success: false, error: 'Failed to activate account' }
  }
}

export { createAdminClient } from './server'

export async function sendPasswordResetEmail(email: string): Promise<{ error: string | null }> {
  const supabase = createAdminClient()

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/update-password`,
  })

  return { error: error?.message ?? null }
}
