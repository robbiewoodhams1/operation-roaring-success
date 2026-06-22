'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { deletePendingUserAction } from './actions'

export function DeletePendingButton({ userId }: { userId: string }) {
  const router = useRouter()
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    setDeleting(true)
    await deletePendingUserAction(userId)
    router.push('/users')
  }

  return (
    <Button variant="destructive" size="sm" onClick={handleDelete} disabled={deleting}>
      {deleting ? 'Deleting...' : 'Delete'}
    </Button>
  )
}
