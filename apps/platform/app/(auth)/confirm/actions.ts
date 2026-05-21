'use server'

import { activateUser } from '@roaring/auth/server'
import { createAdminClient } from '@roaring/auth/server'

export async function setPasswordAndActivate({
  password,
  accessToken,
  refreshToken,
}: {
  password: string
  accessToken: string
  refreshToken: string
}): Promise<{ error: string | null }> {
  // Use the admin client to set the session from the invite tokens
  const supabase = createAdminClient()

  // Exchange the invite tokens for a real session
  const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  })

  if (sessionError || !sessionData.user) {
    return { error: sessionError?.message ?? 'Invalid invite link' }
  }

  // Update the password
  const { error: updateError } = await supabase.auth.admin.updateUserById(sessionData.user.id, {
    password,
  })

  if (updateError) {
    return { error: updateError.message }
  }

  // Activate in app.users
  const { error: activateError } = await activateUser(sessionData.user.id)

  if (activateError) {
    return { error: activateError }
  }

  return { error: null }
}
