'use server'

import { activateUser } from '@roaring/auth/server'
import { createAdminClient } from '@roaring/auth/server'
import { db, users } from '@roaring/db'
import { eq } from 'drizzle-orm'
import { revalidateTag } from 'next/cache'

export async function setPasswordAndActivate({
  password,
  accessToken,
  refreshToken,
}: {
  password: string
  accessToken: string
  refreshToken: string
}): Promise<{ error: string | null }> {
  const supabase = createAdminClient()

  const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  })

  if (sessionError || !sessionData.user) {
    return { error: sessionError?.message ?? 'Invalid invite link' }
  }

  const { error: updateError } = await supabase.auth.admin.updateUserById(sessionData.user.id, {
    password,
  })

  if (updateError) {
    return { error: updateError.message }
  }

  const { error: activateError } = await activateUser(sessionData.user.id)

  if (activateError) {
    return { error: activateError }
  }

  // Bust the users cache so the admin users list reflects the new active status immediately
  const userRow = await db
    .select({ tenantId: users.tenantId })
    .from(users)
    .where(eq(users.id, sessionData.user.id))
    .limit(1)

  if (userRow[0]) {
    revalidateTag(`users-${userRow[0].tenantId}`, 'max')
  }

  return { error: null }
}
