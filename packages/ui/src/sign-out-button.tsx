'use client'

import { useRouter } from 'next/navigation'
import { signOut } from '@roaring/auth/client'

export function SignOutButton({ className }: { className?: string }) {
  const router = useRouter()

  async function handleSignOut() {
    await signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <button onClick={handleSignOut} className={className}>
      Sign out
    </button>
  )
}
