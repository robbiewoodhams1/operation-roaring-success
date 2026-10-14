'use client'

import { useEffect, useState, useTransition } from 'react'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { getMetric } from '@/lib/stats/metrics'
import { PERIOD_LABELS, type Period } from '@/lib/stats/periods'
import type { StatsEvent, EventCursor } from '@/lib/stats/queries'
import { getMetricEvents, type DrillScope } from './actions'
import { EventItem } from './event-item'

export interface DrillTarget {
  metricKey: string
  scope: DrillScope
  /** Whose figure this is, for the heading — e.g. "You", "Team A". */
  subject: string
}

function targetKey(t: DrillTarget) {
  return `${t.metricKey}|${JSON.stringify(t.scope)}`
}

/** The event list for one target. Remounted (via key) whenever the target changes. */
function EventsList({ target, period }: { target: DrillTarget; period: Period }) {
  const [events, setEvents] = useState<StatsEvent[]>([])
  const [cursor, setCursor] = useState<EventCursor | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [pending, startTransition] = useTransition()
  const [now] = useState(() => new Date())

  useEffect(() => {
    startTransition(async () => {
      const result = await getMetricEvents({
        metricKey: target.metricKey,
        period,
        scope: target.scope,
      })
      if (result.ok) {
        setEvents(result.page.events)
        setCursor(result.page.nextCursor)
      } else {
        setError(result.error)
      }
      setLoaded(true)
    })
  }, [target, period])

  function loadMore() {
    if (!cursor) return
    startTransition(async () => {
      const result = await getMetricEvents({
        metricKey: target.metricKey,
        period,
        scope: target.scope,
        cursor,
      })
      if (result.ok) {
        setEvents((prev) => [...prev, ...result.page.events])
        setCursor(result.page.nextCursor)
      } else {
        setError(result.error)
      }
    })
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {!loaded && (
        <div className="p-4 space-y-3" aria-busy>
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-3/4" />
        </div>
      )}
      {error && <p className="p-4 text-sm text-destructive">{error}</p>}
      {loaded && !error && events.length === 0 && (
        <p className="p-6 text-sm text-center text-muted-foreground">
          Nothing recorded in this period yet.
        </p>
      )}
      {events.length > 0 && (
        <ul className="divide-y">
          {events.map((e) => (
            <EventItem key={e.id} event={e} now={now} showCredited={target.scope.kind !== 'user'} />
          ))}
        </ul>
      )}
      {cursor && (
        <div className="p-4">
          <Button variant="outline" className="w-full" onClick={loadMore} disabled={pending}>
            {pending ? 'Loading…' : 'Load more'}
          </Button>
        </div>
      )}
    </div>
  )
}

/** Lists the events that make up one figure, newest first, 25 at a time. */
export function EventsSheet({
  target,
  period,
  onClose,
}: {
  target: DrillTarget | null
  period: Period
  onClose: () => void
}) {
  const metric = target ? getMetric(target.metricKey) : null

  return (
    <Sheet open={target !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col">
        <SheetHeader className="border-b">
          <SheetTitle>
            {metric?.label} · {target?.subject}
          </SheetTitle>
          <SheetDescription>
            {PERIOD_LABELS[period]}. {metric?.definition} Credit: {metric?.creditedTo}.
          </SheetDescription>
        </SheetHeader>
        {target && (
          <EventsList key={`${targetKey(target)}|${period}`} target={target} period={period} />
        )}
      </SheetContent>
    </Sheet>
  )
}
