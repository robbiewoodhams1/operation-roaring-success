import { describe, it, expect } from 'vitest'
import {
  comparisonRange,
  londonTime,
  londonWallClock,
  periodRange,
  isPeriod,
  trendBucket,
} from '../periods'

const iso = (d: Date) => d.toISOString()

describe('londonTime', () => {
  it('is UTC+0 in winter and UTC+1 in summer', () => {
    expect(iso(londonTime(2026, 1, 15))).toBe('2026-01-15T00:00:00.000Z')
    expect(iso(londonTime(2026, 7, 15))).toBe('2026-07-14T23:00:00.000Z')
  })

  it('handles the spring-forward day (29 Mar 2026): midnight is still GMT', () => {
    expect(iso(londonTime(2026, 3, 29))).toBe('2026-03-29T00:00:00.000Z')
    expect(iso(londonTime(2026, 3, 30))).toBe('2026-03-29T23:00:00.000Z')
  })

  it('moves a wall time inside the spring gap to just after it', () => {
    // 01:30 doesn't exist on 29 Mar 2026 — clocks jump 01:00 → 02:00.
    const t = londonTime(2026, 3, 29, 1, 30)
    expect(londonWallClock(t).hour).toBe(2)
  })

  it('resolves the repeated autumn hour (25 Oct 2026) to its first occurrence', () => {
    expect(iso(londonTime(2026, 10, 25, 1, 30))).toBe('2026-10-25T00:30:00.000Z')
    expect(iso(londonTime(2026, 10, 26))).toBe('2026-10-26T00:00:00.000Z')
  })
})

describe('periodRange', () => {
  // Tuesday 13 Oct 2026, 14:05 BST
  const now = new Date('2026-10-13T13:05:00.000Z')

  it('today starts at London midnight and runs to now', () => {
    const r = periodRange('today', now)
    expect(iso(r.start)).toBe('2026-10-12T23:00:00.000Z')
    expect(r.end).toBe(now)
  })

  it('week to date starts on Monday', () => {
    expect(iso(periodRange('wtd', now).start)).toBe('2026-10-11T23:00:00.000Z') // Mon 12 Oct 00:00 BST
  })

  it('a Monday is the first day of its own week', () => {
    const monday = new Date('2026-10-12T08:00:00Z')
    expect(iso(periodRange('wtd', monday).start)).toBe('2026-10-11T23:00:00.000Z')
  })

  it('a Sunday belongs to the week that began the previous Monday', () => {
    const sunday = new Date('2026-10-18T20:00:00Z')
    expect(iso(periodRange('wtd', sunday).start)).toBe('2026-10-11T23:00:00.000Z')
  })

  it('month to date starts on the 1st', () => {
    expect(iso(periodRange('mtd', now).start)).toBe('2026-09-30T23:00:00.000Z')
  })

  it('year to date starts on 1 January (GMT)', () => {
    expect(iso(periodRange('ytd', now).start)).toBe('2026-01-01T00:00:00.000Z')
  })

  it('uses the London date, not the UTC date, just after midnight in summer', () => {
    // 00:30 BST on 1 Aug is still 31 Jul in UTC.
    const justAfterMidnight = new Date('2026-07-31T23:30:00Z')
    expect(iso(periodRange('today', justAfterMidnight).start)).toBe('2026-07-31T23:00:00.000Z')
    expect(iso(periodRange('mtd', justAfterMidnight).start)).toBe('2026-07-31T23:00:00.000Z')
  })

  it('a week spanning the autumn change starts at BST midnight', () => {
    // Wed 28 Oct 2026 (GMT); its Monday, 26 Oct, is already GMT.
    expect(iso(periodRange('wtd', new Date('2026-10-28T12:00:00Z')).start)).toBe(
      '2026-10-26T00:00:00.000Z'
    )
    // Sun 25 Oct (the change day); its Monday, 19 Oct, was BST.
    expect(iso(periodRange('wtd', new Date('2026-10-25T12:00:00Z')).start)).toBe(
      '2026-10-18T23:00:00.000Z'
    )
  })

  it('the spring-change day is 23 hours long', () => {
    const r = periodRange('today', new Date('2026-03-29T22:59:59Z'))
    const tomorrow = periodRange('today', new Date('2026-03-29T23:00:00Z'))
    expect(tomorrow.start.getTime() - r.start.getTime()).toBe(23 * 3_600_000)
  })
})

describe('comparisonRange', () => {
  const now = new Date('2026-10-13T13:05:00.000Z') // Tue 14:05 BST

  it('today compares with yesterday up to the same time', () => {
    const r = comparisonRange('today', now)
    expect(iso(r.start)).toBe('2026-10-11T23:00:00.000Z')
    expect(iso(r.end)).toBe('2026-10-12T13:05:00.000Z')
  })

  it('week to date compares with last week up to the same weekday and time', () => {
    const r = comparisonRange('wtd', now)
    expect(iso(r.start)).toBe('2026-10-04T23:00:00.000Z')
    expect(iso(r.end)).toBe('2026-10-06T13:05:00.000Z')
  })

  it('month to date clamps to the end of a shorter previous month', () => {
    // 31 Mar 13:00 BST → 28 Feb 13:00 GMT (same wall-clock time, clamped day).
    const r = comparisonRange('mtd', new Date('2026-03-31T12:00:00Z'))
    expect(iso(r.start)).toBe('2026-02-01T00:00:00.000Z')
    expect(iso(r.end)).toBe('2026-02-28T13:00:00.000Z')
  })

  it('January compares with December of the previous year', () => {
    const r = comparisonRange('mtd', new Date('2026-01-10T09:00:00Z'))
    expect(iso(r.start)).toBe('2025-12-01T00:00:00.000Z')
    expect(iso(r.end)).toBe('2025-12-10T09:00:00.000Z')
  })

  it('year to date maps 29 February to 28 February', () => {
    const r = comparisonRange('ytd', new Date('2028-02-29T10:00:00Z'))
    expect(iso(r.start)).toBe('2027-01-01T00:00:00.000Z')
    expect(iso(r.end)).toBe('2027-02-28T10:00:00.000Z')
  })

  it('keeps the same wall-clock time across a DST change', () => {
    // Mon 30 Mar 2026 09:00 BST vs Sun 29 Mar 09:00 BST (after the change)
    const r = comparisonRange('today', new Date('2026-03-30T08:00:00Z'))
    expect(londonWallClock(r.end).hour).toBe(9)
    // Mon 26 Oct 09:00 GMT vs Sun 25 Oct 09:00 GMT
    const a = comparisonRange('today', new Date('2026-10-26T09:00:00Z'))
    expect(iso(a.end)).toBe('2026-10-25T09:00:00.000Z')
  })

  it('never overlaps the current period', () => {
    for (const p of ['today', 'wtd', 'mtd', 'ytd'] as const) {
      expect(comparisonRange(p, now).end.getTime()).toBeLessThanOrEqual(
        periodRange(p, now).start.getTime()
      )
    }
  })
})

describe('helpers', () => {
  it('validates periods', () => {
    expect(isPeriod('wtd')).toBe(true)
    expect(isPeriod('week')).toBe(false)
    expect(isPeriod(undefined)).toBe(false)
  })

  it('picks a trend granularity per period', () => {
    expect(trendBucket('today')).toBe('hour')
    expect(trendBucket('wtd')).toBe('day')
    expect(trendBucket('mtd')).toBe('day')
    expect(trendBucket('ytd')).toBe('month')
  })
})
