'use client'

import { Button } from '@/components/ui/button'

export default function StatsError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="p-6 max-w-lg">
      <div className="rounded-xl border bg-card px-4 py-8 text-center space-y-3">
        <p className="text-sm font-medium">The Stats Board couldn’t load</p>
        <p className="text-sm text-muted-foreground">
          No figures are shown rather than risk showing wrong ones. Try again, and if it keeps
          happening let an admin know.
        </p>
        <Button variant="outline" onClick={reset}>
          Try again
        </Button>
      </div>
    </div>
  )
}
