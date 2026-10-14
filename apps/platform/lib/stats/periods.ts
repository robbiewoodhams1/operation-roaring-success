/**
 * Reporting periods on Europe/London calendar boundaries.
 *
 * Every period runs from a London midnight up to "now" (inclusive of activity
 * recorded so far). Weeks start on Monday. All maths is done on wall-clock
 * dates and converted to UTC instants at the end, so BST/GMT changes never
 * shift a boundary by an hour.
 */

export const BUSINESS_TIME_ZONE = 'Europe/London'

export const PERIODS = ['today', 'wtd', 'mtd', 'ytd'] as const
export type Period = (typeof PERIODS)[number]

export const PERIOD_LABELS: Record<Period, string> = {
  today: 'Today',
  wtd: 'Week to date',
  mtd: 'Month to date',
  ytd: 'Year to date',
}

export const PERIOD_SHORT_LABELS: Record<Period, string> = {
  today: 'Today',
  wtd: 'WTD',
  mtd: 'MTD',
  ytd: 'YTD',
}

export function isPeriod(value: unknown): value is Period {
  return typeof value === 'string' && (PERIODS as readonly string[]).includes(value)
}

export interface Range {
  /** Inclusive. */
  start: Date
  /** Exclusive. */
  end: Date
}

interface WallClock {
  year: number
  month: number // 1–12
  day: number
  hour: number
  minute: number
  second: number
  millisecond: number
}

const partsFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: BUSINESS_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
})

/** The London wall-clock reading at an instant. */
export function londonWallClock(instant: Date): WallClock {
  const parts: Record<string, number> = {}
  for (const p of partsFormatter.formatToParts(instant)) {
    if (p.type !== 'literal') parts[p.type] = Number(p.value)
  }
  return {
    year: parts.year!,
    month: parts.month!,
    day: parts.day!,
    hour: parts.hour!,
    minute: parts.minute!,
    second: parts.second!,
    millisecond: instant.getUTCMilliseconds(),
  }
}

function readsAs(instant: number, wall: number): boolean {
  const w = londonWallClock(new Date(instant))
  return Date.UTC(w.year, w.month - 1, w.day, w.hour, w.minute, w.second, w.millisecond) === wall
}

/**
 * The instant at which London's clocks read the given wall time. London is
 * only ever UTC+0 or UTC+1, so both candidates are checked: an ambiguous
 * autumn time resolves to its first (BST) occurrence, and a time inside the
 * spring-forward gap resolves to the instant just after the gap.
 */
export function londonTime(
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0,
  second = 0,
  millisecond = 0
): Date {
  const wall = Date.UTC(year, month - 1, day, hour, minute, second, millisecond)
  const bst = wall - 3_600_000
  if (readsAs(bst, wall)) return new Date(bst)
  return new Date(wall)
}

/** Calendar arithmetic on a plain date (no time zone involved). */
function addDays(y: number, m: number, d: number, days: number) {
  const date = new Date(Date.UTC(y, m - 1, d + days))
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, day: date.getUTCDate() }
}

function daysInMonth(y: number, m: number) {
  return new Date(Date.UTC(y, m, 0)).getUTCDate()
}

/** Monday = 0 … Sunday = 6. */
function weekdayIndex(y: number, m: number, d: number) {
  return (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7
}

function periodStartDate(period: Period, w: { year: number; month: number; day: number }) {
  switch (period) {
    case 'today':
      return { year: w.year, month: w.month, day: w.day }
    case 'wtd':
      return addDays(w.year, w.month, w.day, -weekdayIndex(w.year, w.month, w.day))
    case 'mtd':
      return { year: w.year, month: w.month, day: 1 }
    case 'ytd':
      return { year: w.year, month: 1, day: 1 }
  }
}

/** The current reporting period: London midnight at its start up to `now`. */
export function periodRange(period: Period, now: Date = new Date()): Range {
  const w = londonWallClock(now)
  const s = periodStartDate(period, w)
  return { start: londonTime(s.year, s.month, s.day), end: now }
}

/**
 * The same span of the previous period: yesterday up to this time of day,
 * last week up to the same weekday and time, last month up to the same day
 * (clamped to its length), last year up to the same date (29 Feb → 28 Feb).
 */
export function comparisonRange(period: Period, now: Date = new Date()): Range {
  const w = londonWallClock(now)
  const current = periodStartDate(period, w)

  let prevStart: { year: number; month: number; day: number }
  let prevEndDate: { year: number; month: number; day: number }

  switch (period) {
    case 'today':
      prevStart = addDays(w.year, w.month, w.day, -1)
      prevEndDate = prevStart
      break
    case 'wtd': {
      prevStart = addDays(current.year, current.month, current.day, -7)
      prevEndDate = addDays(w.year, w.month, w.day, -7)
      break
    }
    case 'mtd': {
      const pm =
        w.month === 1 ? { year: w.year - 1, month: 12 } : { year: w.year, month: w.month - 1 }
      prevStart = { ...pm, day: 1 }
      prevEndDate = { ...pm, day: Math.min(w.day, daysInMonth(pm.year, pm.month)) }
      break
    }
    case 'ytd': {
      prevStart = { year: w.year - 1, month: 1, day: 1 }
      prevEndDate = {
        year: w.year - 1,
        month: w.month,
        day: Math.min(w.day, daysInMonth(w.year - 1, w.month)),
      }
      break
    }
  }

  const start = londonTime(prevStart.year, prevStart.month, prevStart.day)
  let end = londonTime(
    prevEndDate.year,
    prevEndDate.month,
    prevEndDate.day,
    w.hour,
    w.minute,
    w.second,
    w.millisecond
  )
  const currentStart = londonTime(current.year, current.month, current.day)
  if (end > currentStart) end = currentStart
  return { start, end }
}

/** Trend granularity for a period: hours for today, days for week/month, months for year. */
export function trendBucket(period: Period): 'hour' | 'day' | 'month' {
  if (period === 'today') return 'hour'
  if (period === 'ytd') return 'month'
  return 'day'
}

const rangeDate = new Intl.DateTimeFormat('en-GB', {
  timeZone: BUSINESS_TIME_ZONE,
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})
const rangeTime = new Intl.DateTimeFormat('en-GB', {
  timeZone: BUSINESS_TIME_ZONE,
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

/** e.g. "6 Oct 2026 – 13 Oct 2026, 14:05" */
export function describeRange(range: Range): string {
  const startDay = rangeDate.format(range.start)
  const endDay = rangeDate.format(range.end)
  const time = rangeTime.format(range.end)
  return startDay === endDay ? `${startDay}, 00:00–${time}` : `${startDay} – ${endDay}, ${time}`
}
