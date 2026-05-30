'use client'

import { createClient } from './client'
import type { AuthUser } from './types'

export async function signIn(
  email: string,
  password: string
): Promise<{ user: AuthUser | null; error: string | null }> {
  const supabase = createClient()

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return { user: null, error: error.message }
  }

  if (!data.user) {
    return { user: null, error: 'No user returned' }
  }

  return {
    user: {
      id: data.user.id,
      email: data.user.email ?? '',
      fullName: data.user.user_metadata?.full_name ?? '',
      role: data.user.user_metadata?.role ?? 'agent',
      tenantId: data.user.user_metadata?.tenant_id ?? '',
      approvalStatus: data.user.user_metadata?.approval_status ?? 'pending',
    },
    error: null,
  }
}

export async function signOut(): Promise<{ error: string | null }> {
  const supabase = createClient()
  const { error } = await supabase.auth.signOut()
  return { error: error?.message ?? null }
}

export async function getSession() {
  const supabase = createClient()
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession()
  if (error || !session) return null
  return session
}

export async function resetPassword(email: string): Promise<{ error: string | null }> {
  const supabase = createClient()

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/update-password`,
  })

  return { error: error?.message ?? null }
}

export async function setSessionFromTokens(
  accessToken: string,
  refreshToken: string
): Promise<{ error: string | null }> {
  const supabase = createClient()
  const { error } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  })
  return { error: error?.message ?? null }
}

export async function updatePassword(password: string): Promise<{ error: string | null }> {
  const supabase = createClient()
  const { error } = await supabase.auth.updateUser({ password })
  return { error: error?.message ?? null }
}
