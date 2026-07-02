'use client'

import { useOptimistic, useTransition } from 'react'
import { useRouter } from 'next/navigation'

export function useOptimisticStatus<T>(value: T) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [optimistic, setOptimistic] = useOptimistic(value)

  function apply(next: T, action: () => Promise<void>) {
    startTransition(async () => {
      setOptimistic(next)
      await action()
      router.refresh()
    })
  }

  return [optimistic, apply, isPending] as const
}
