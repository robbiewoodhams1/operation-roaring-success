import type { Comparison } from './compare'
import type { StatsEvent } from './queries'
import { BUSINESS_TIME_ZONE, type Period } from './periods'

const integer = new Intl.NumberFormat('en-GB', { maximumFractionDigits: 0 })

export function formatCount(n: number): string {
  return integer.format(n)
}

const COMPARISON_LABELS: Record<Period, string> = {
  today: 'same time yesterday',
  wtd: 'same point last week',
  mtd: 'same point last month',
  ytd: 'same point last year',
}

export function comparisonLabel(period: Period): string {
  return COMPARISON_LABELS[period]
}

export type ChangeDirection = 'up' | 'down' | 'flat' | 'none'

/** A short, honest description of a comparison — never a % without a baseline. */
export function describeComparison(c: Comparison): { text: string; direction: ChangeDirection } {
  if (c.kind === 'no_baseline') return { text: 'No comparable history', direction: 'none' }
  if (c.delta === 0)
    return { text: `Same as before (${formatCount(c.previous)})`, direction: 'flat' }
  const sign = c.delta > 0 ? '+' : '−'
  const abs = formatCount(Math.abs(c.delta))
  const pct = c.percent === null ? '' : ` (${sign}${Math.abs(c.percent)}%)`
  return {
    text: `${sign}${abs}${pct} vs ${formatCount(c.previous)}`,
    direction: c.delta > 0 ? 'up' : 'down',
  }
}

const dateTime = new Intl.DateTimeFormat('en-GB', {
  timeZone: BUSINESS_TIME_ZONE,
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

const dateTimeWithYear = new Intl.DateTimeFormat('en-GB', {
  timeZone: BUSINESS_TIME_ZONE,
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

export function formatDateTime(iso: string, now = new Date()): string {
  const d = new Date(iso)
  return d.getUTCFullYear() === now.getUTCFullYear()
    ? dateTime.format(d)
    : dateTimeWithYear.format(d)
}

/** "just now", "5 min ago", "3 h ago", then the date. */
export function formatRelative(iso: string, now = new Date()): string {
  const diff = now.getTime() - new Date(iso).getTime()
  if (diff < 60_000) return 'just now'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} min ago`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} h ago`
  return formatDateTime(iso, now)
}

const bucketFormats = {
  hour: new Intl.DateTimeFormat('en-GB', { hour: '2-digit', hourCycle: 'h23', timeZone: 'UTC' }),
  day: new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', timeZone: 'UTC' }),
  month: new Intl.DateTimeFormat('en-GB', { month: 'short', timeZone: 'UTC' }),
}

/** Labels a London-local bucket key ("2026-10-13T09:00:00") without re-applying a zone. */
export function formatBucket(bucket: string, size: 'hour' | 'day' | 'month'): string {
  const label = bucketFormats[size].format(new Date(`${bucket}Z`))
  return size === 'hour' ? `${label}:00` : label
}

export const REASON_LABELS: Record<string, string> = {
  source_deleted: 'record deleted',
  status_corrected: 'status corrected to not applied',
  status_changed_from_live: 'no longer live',
  dispatch_reversed: 'dispatch undone',
  reopened: 'reopened',
  outcome_cleared: 'outcome cleared',
  attribution_corrected: 'credit corrected',
}

/** Where an event's source record lives in the CRM, if it has a page. */
export function sourceHref(event: Pick<StatsEvent, 'sourceType' | 'sourceId' | 'subjectKey'>) {
  switch (event.sourceType) {
    case 'deal':
      return `/deals/${event.sourceId}`
    case 'provisioning':
      return `/provisioning/${event.sourceId}`
    case 'provisioning_service': {
      const provisioningId = event.subjectKey.split(':')[1]
      return provisioningId ? `/provisioning/${provisioningId}` : null
    }
    case 'faults':
      return `/faults/${event.sourceId}`
    case 'complaints':
      return `/complaints/${event.sourceId}`
    case 'debts':
      return `/debt/${event.sourceId}`
    case 'transfer_ceases':
      return `/transfers-ceases/${event.sourceId}`
    case 'todos':
      return `/todo/${event.sourceId}`
    default:
      return null
  }
}
