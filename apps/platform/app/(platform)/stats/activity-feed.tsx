'use client'

import { useEffect, useState, useSyncExternalStore, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import type { EventCursor, StatsEvent } from '@/lib/stats/queries'
import { getActivityFeed } from './actions'
import { EventItem } from './event-item'

const SEEN_KEY = (userId: string) => `stats:last-seen:${userId}`

function readSeen(userId: string): string | null {
  try {
    return window.localStorage.getItem(SEEN_KEY(userId))
  } catch {
    return null
  }
}

function writeSeen(userId: string, iso: string) {
  try {
    window.localStorage.setItem(SEEN_KEY(userId), iso)
  } catch {
    // Storage unavailable (private mode, blocked) — "new" markers just won't persist.
  }
}

// The previous visit, read once per page load. The visit being made now is
// stored straight away (after first paint) so the next load compares to it.
const previousVisit = new Map<string, string>()

function previousVisitFor(userId: string): string {
  let value = previousVisit.get(userId)
  if (value === undefined) {
    value = readSeen(userId) ?? new Date(Date.now() - 3_600_000).toISOString()
    previousVisit.set(userId, value)
  }
  return value
}

const noSubscription = () => () => {}

/**
 * Recent credited activity the viewer is allowed to see. Anything recorded
 * since their last visit to the board is marked "New"; with no stored visit,
 * the last hour counts as new.
 */
export function ActivityFeed({
  userId,
  initial,
  initialCursor,
  scopeLabel,
}: {
  userId: string
  initial: StatsEvent[]
  initialCursor: EventCursor | null
  scopeLabel: string
}) {
  const [events, setEvents] = useState(initial)
  const [cursor, setCursor] = useState(initialCursor)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const [now] = useState(() => new Date())
  // null while server-rendering, so nothing is marked "New" until the client knows.
  const seenBefore = useSyncExternalStore(
    noSubscription,
    () => previousVisitFor(userId),
    () => null
  )

  useEffect(() => {
    previousVisitFor(userId)
    writeSeen(userId, new Date().toISOString())
  }, [userId])

  function loadMore() {
    if (!cursor) return
    startTransition(async () => {
      const result = await getActivityFeed({ cursor })
      if (result.ok) {
        setEvents((prev) => [...prev, ...result.page.events])
        setCursor(result.page.nextCursor)
      } else {
        setError(result.error)
      }
    })
  }

  const seenAt = seenBefore ? Date.parse(seenBefore) : null
  const isNew = (e: StatsEvent) => seenAt !== null && Date.parse(e.recordedAt) > seenAt
  const newCount = events.filter(isNew).length

  return (
    <section
      className="rounded-xl border bg-card overflow-hidden"
      aria-labelledby="activity-heading"
    >
      <div className="px-4 py-3 border-b flex items-center justify-between gap-2">
        <div>
          <h2 id="activity-heading" className="text-sm font-medium">
            Recent activity
          </h2>
          <p className="text-xs text-muted-foreground">{scopeLabel}</p>
        </div>
        {newCount > 0 && (
          <span className="text-xs font-medium" aria-live="polite">
            {newCount} new since your last visit
          </span>
        )}
      </div>
      {events.length === 0 ? (
        <p className="px-4 py-10 text-sm text-center text-muted-foreground">
          No credited activity yet. Deals and provisioning milestones will appear here as they
          happen.
        </p>
      ) : (
        <ul className="divide-y">
          {events.map((e) => (
            <EventItem key={e.id} event={e} now={now} isNew={isNew(e)} />
          ))}
        </ul>
      )}
      {error && <p className="px-4 py-2 text-sm text-destructive">{error}</p>}
      {cursor && (
        <div className="p-3 border-t">
          <Button
            variant="ghost"
            size="sm"
            className="w-full"
            onClick={loadMore}
            disabled={pending}
          >
            {pending ? 'Loading…' : 'Show older activity'}
          </Button>
        </div>
      )}
    </section>
  )
}
