'use server'

import { sendPasswordResetEmail } from '@roaring/auth/server'

export async function resetPasswordAction(email: string) {
  return sendPasswordResetEmail(email)
}
