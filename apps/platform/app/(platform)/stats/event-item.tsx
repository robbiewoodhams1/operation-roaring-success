import Link from 'next/link'
import { CirclePlus, Undo2, History, UserX } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { describeEvent } from '@/lib/stats/metrics'
import { formatDateTime, formatRelative, REASON_LABELS, sourceHref } from '@/lib/stats/format'
import type { StatsEvent } from '@/lib/stats/queries'

const SOURCE_LABELS: Record<string, string> = {
  deal: 'Deal',
  provisioning: 'Provisioning',
  provisioning_service: 'Provisioning',
  faults: 'Fault',
  complaints: 'Complaint',
  debts: 'Debt',
  transfer_ceases: 'Transfer / cease',
  todos: 'To-do',
}

/**
 * One credit event. Awards and reversals are told apart by icon and wording
 * as well as colour; customer details are never shown — only a link to the
 * record for people who can open it.
 */
export function EventItem({
  event,
  isNew = false,
  showCredited = true,
  now,
}: {
  event: StatsEvent
  isNew?: boolean
  showCredited?: boolean
  now: Date
}) {
  const reversal = event.kind === 'reversal'
  const href = sourceHref(event)
  const label = describeEvent(event.eventType, event.serviceType)
  const credited = event.creditedName ?? null
  const actorDiffers = event.actorUserId && event.actorUserId !== event.creditedUserId

  return (
    <li className={cn('flex gap-3 px-4 py-3', isNew && 'bg-primary/[0.03]')}>
      <div className="pt-0.5 shrink-0" aria-hidden>
        {reversal ? (
          <Undo2 className="size-4 text-destructive" />
        ) : (
          <CirclePlus className="size-4 text-muted-foreground" />
        )}
      </div>
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-sm font-medium">
            {reversal ? `${label} — credit reversed` : label}
          </span>
          {reversal ? (
            <Badge variant="outline" className="border-destructive/30 text-destructive">
              −1 Reversed
            </Badge>
          ) : (
            <Badge variant="outline" className="text-muted-foreground">
              +1 Awarded
            </Badge>
          )}
          {isNew && (
            <Badge
              className="bg-primary text-primary-foreground"
              aria-label="New since your last visit"
            >
              New
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          {showCredited && (
            <>
              {credited ? (
                <>
                  Credit: <span className="text-foreground">{credited}</span>
                  {event.creditedActive === false && ' (inactive)'}
                  {event.teamName && ` · ${event.teamName}`}
                </>
              ) : (
                <span className="inline-flex items-center gap-1">
                  <UserX className="size-3" aria-hidden />
                  Unattributed
                </span>
              )}
              {' · '}
            </>
          )}
          {actorDiffers && event.actorName && <>Recorded by {event.actorName} · </>}
          {reversal && event.reason && (
            <>Reason: {REASON_LABELS[event.reason] ?? event.reason} · </>
          )}
          <time dateTime={event.occurredAt} title={formatDateTime(event.occurredAt, now)}>
            {formatRelative(event.occurredAt, now)}
          </time>
        </p>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {event.origin === 'backfill' && (
            <span className="inline-flex items-center gap-1 text-muted-foreground">
              <History className="size-3" aria-hidden />
              Rebuilt from history
            </span>
          )}
          {href && (
            <Link
              href={href}
              className="text-muted-foreground underline underline-offset-2 hover:text-foreground"
            >
              {SOURCE_LABELS[event.sourceType] ?? 'Record'}
            </Link>
          )}
        </div>
      </div>
    </li>
  )
}
