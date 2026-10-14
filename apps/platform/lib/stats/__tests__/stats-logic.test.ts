import { describe, it, expect } from 'vitest'
import { compare, includesHistory } from '../compare'
import {
  ACTIVE_METRICS,
  LEADERBOARD_METRICS,
  METRICS,
  getMetric,
  matches,
  metricValue,
  VISIBLE_EVENT_TYPES,
} from '../metrics'
import {
  canViewTeamEvents,
  canViewUnattributedEvents,
  canViewUserEvents,
  feedScope,
  type Viewer,
} from '../permissions'
import { rankLeaderboard } from '../leaderboard'
import { describeComparison, formatBucket, sourceHref } from '../format'
import type { Person } from '../queries'

const range = (start: string, end: string) => ({ start: new Date(start), end: new Date(end) })

describe('compare', () => {
  const coverage = { liveFrom: new Date('2026-10-13T10:00:00Z'), backfilledAt: null }

  it('reports no baseline when the comparison period predates tracking', () => {
    const c = compare(5, 0, range('2026-10-12T00:00:00Z', '2026-10-12T12:00:00Z'), coverage)
    expect(c.kind).toBe('no_baseline')
  })

  it('gives an absolute change but no percentage when the baseline is zero', () => {
    const c = compare(4, 0, range('2026-10-14T00:00:00Z', '2026-10-14T12:00:00Z'), coverage)
    expect(c).toEqual({ kind: 'change', previous: 0, delta: 4, percent: null })
  })

  it('gives a rounded percentage against a real baseline', () => {
    const c = compare(3, 2, range('2026-10-14T00:00:00Z', '2026-10-14T12:00:00Z'), coverage)
    expect(c).toEqual({ kind: 'change', previous: 2, delta: 1, percent: 50 })
  })

  it('flags ranges that reach back before live tracking', () => {
    expect(includesHistory(range('2026-10-01T00:00:00Z', '2026-10-14T00:00:00Z'), coverage)).toBe(
      true
    )
    expect(includesHistory(range('2026-10-13T11:00:00Z', '2026-10-14T00:00:00Z'), coverage)).toBe(
      false
    )
  })

  it('describes changes without inventing growth', () => {
    expect(describeComparison({ kind: 'no_baseline', reason: '' }).text).toBe(
      'No comparable history'
    )
    expect(describeComparison({ kind: 'change', previous: 0, delta: 3, percent: null }).text).toBe(
      '+3 vs 0'
    )
    expect(describeComparison({ kind: 'change', previous: 4, delta: -1, percent: -25 }).text).toBe(
      '−1 (−25%) vs 4'
    )
    expect(
      describeComparison({ kind: 'change', previous: 2, delta: 0, percent: 0 }).direction
    ).toBe('flat')
  })
})

describe('metric registry', () => {
  it('has unique keys', () => {
    expect(new Set(METRICS.map((m) => m.key)).size).toBe(METRICS.length)
  })

  it('only activates approved metrics', () => {
    const active = ACTIVE_METRICS.map((m) => m.key)
    expect(active).toContain('deals_opened')
    expect(active).toContain('deals_closed')
    expect(active).toContain('broadband_live')
    expect(active).not.toContain('routers_dispatched')
    expect(active).not.toContain('todos_completed')
    expect(active).not.toContain('mobile_live')
  })

  it('explains every metric that is not shown', () => {
    for (const m of METRICS.filter((m) => m.status !== 'active')) {
      expect(m.statusNote, m.key).toBeTruthy()
    }
  })

  it('never offers an inactive metric on the leaderboard', () => {
    expect(LEADERBOARD_METRICS.every((m) => m.status === 'active')).toBe(true)
  })

  it('groups service types into broadband and voice', () => {
    const rows = [
      { eventType: 'service_live', serviceType: 'bb', total: 2 },
      { eventType: 'service_live', serviceType: 'mpf_broadband', total: 1 },
      { eventType: 'service_live', serviceType: 'whc', total: 4 },
      { eventType: 'service_live', serviceType: 'nfon', total: 1 },
      { eventType: 'service_applied', serviceType: 'bb', total: 9 },
    ]
    expect(metricValue(getMetric('broadband_live')!, rows)).toBe(3)
    expect(metricValue(getMetric('voice_live')!, rows)).toBe(5)
    expect(metricValue(getMetric('bb_live')!, rows)).toBe(2)
    expect(metricValue(getMetric('broadband_applied')!, rows)).toBe(9)
  })

  it('nets reversals within a metric', () => {
    const rows = [{ eventType: 'deal_opened', serviceType: null, total: 0 }]
    expect(metricValue(getMetric('deals_opened')!, rows)).toBe(0)
  })

  it('never matches deal events to service metrics or vice versa', () => {
    expect(
      matches(getMetric('broadband_live')!, { eventType: 'deal_closed', serviceType: null })
    ).toBe(false)
    expect(
      matches(getMetric('deals_closed')!, { eventType: 'service_live', serviceType: 'bb' })
    ).toBe(false)
  })

  it('feeds only events behind visible metrics into the activity feed', () => {
    expect(VISIBLE_EVENT_TYPES).toEqual(
      expect.arrayContaining(['deal_opened', 'deal_closed', 'service_applied', 'service_live'])
    )
    expect(VISIBLE_EVENT_TYPES).not.toContain('router_dispatched')
  })
})

describe('permissions', () => {
  const agent: Viewer = { id: 'a', role: 'agent', teamId: 'team-1' }
  const sales: Viewer = { id: 's', role: 'sales', teamId: 'team-1' }
  const leader: Viewer = { id: 'l', role: 'team_leader', teamId: 'team-1' }
  const leaderNoTeam: Viewer = { id: 'l2', role: 'team_leader', teamId: null }
  const manager: Viewer = { id: 'm', role: 'manager', teamId: null }
  const director: Viewer = { id: 'd', role: 'director', teamId: null }
  const admin: Viewer = { id: 'x', role: 'admin', teamId: null }

  it('everyone can see their own events', () => {
    for (const v of [agent, sales, leader, manager]) {
      expect(canViewUserEvents(v, { id: v.id, teamId: v.teamId })).toBe(true)
    }
  })

  it('agents cannot see colleagues’ events, even in their team', () => {
    expect(canViewUserEvents(agent, { id: 'b', teamId: 'team-1' })).toBe(false)
    expect(canViewUserEvents(sales, { id: 'b', teamId: 'team-1' })).toBe(false)
  })

  it('team leaders see their own team only', () => {
    expect(canViewUserEvents(leader, { id: 'b', teamId: 'team-1' })).toBe(true)
    expect(canViewUserEvents(leader, { id: 'c', teamId: 'team-2' })).toBe(false)
    expect(canViewTeamEvents(leader, 'team-1')).toBe(true)
    expect(canViewTeamEvents(leader, 'team-2')).toBe(false)
    // A leader with no team leads nothing — null never matches null.
    expect(canViewUserEvents(leaderNoTeam, { id: 'c', teamId: null })).toBe(false)
  })

  it('managers, directors and admins see everything', () => {
    for (const v of [manager, director, admin]) {
      expect(canViewUserEvents(v, { id: 'anyone', teamId: 'team-9' })).toBe(true)
      expect(canViewTeamEvents(v, 'team-9')).toBe(true)
      expect(canViewUnattributedEvents(v)).toBe(true)
    }
    expect(canViewUnattributedEvents(agent)).toBe(false)
    expect(canViewUnattributedEvents(leader)).toBe(false)
  })

  it('scopes the activity feed by role', () => {
    expect(feedScope(agent)).toEqual({ kind: 'self', userId: 'a' })
    expect(feedScope(leader)).toEqual({ kind: 'team', teamId: 'team-1', userId: 'l' })
    expect(feedScope(leaderNoTeam)).toEqual({ kind: 'self', userId: 'l2' })
    expect(feedScope(manager)).toEqual({ kind: 'tenant' })
  })
})

describe('leaderboard ranking', () => {
  const person = (id: string, fullName: string, extra: Partial<Person> = {}): Person => ({
    id,
    fullName,
    role: 'agent',
    isActive: true,
    approvalStatus: 'approved',
    teamId: 'team-1',
    teamName: 'Team One',
    ...extra,
  })
  const people = [
    person('a', 'Alice'),
    person('b', 'Bob'),
    person('c', 'Cara'),
    person('d', 'Dan', { isActive: false }),
    person('me', 'Me'),
  ]
  const credit = (userId: string | null, total: number) => ({
    userId,
    eventType: 'deal_opened',
    serviceType: null,
    total,
  })
  const viewer: Viewer = { id: 'me', role: 'agent', teamId: 'team-1' }
  const metric = getMetric('deals_opened')!

  it('ranks by count, sharing ranks on ties', () => {
    const rows = rankLeaderboard(
      viewer,
      people,
      [credit('a', 5), credit('b', 3), credit('c', 3), credit('d', 1)],
      metric
    )
    expect(rows.filter((r) => r.rank !== null).map((r) => [r.fullName, r.rank])).toEqual([
      ['Alice', 1],
      ['Bob', 2],
      ['Cara', 2],
      ['Dan', 4],
    ])
  })

  it('keeps inactive employees, labelled', () => {
    const rows = rankLeaderboard(viewer, people, [credit('d', 2)], metric)
    expect(rows.find((r) => r.userId === 'd')?.isActive).toBe(false)
  })

  it('always includes the viewer, unranked when they have nothing', () => {
    const rows = rankLeaderboard(viewer, people, [credit('a', 1)], metric)
    expect(rows.find((r) => r.isViewer)).toMatchObject({ rank: null, value: 0 })
  })

  it('shows unattributed credit below the ranking and never ranks it', () => {
    const rows = rankLeaderboard(viewer, people, [credit('a', 1), credit(null, 7)], metric)
    const last = rows[rows.length - 1]!
    expect(last).toMatchObject({ userId: null, fullName: 'Unattributed', rank: null, value: 7 })
    expect(last.canDrillDown).toBe(false) // agents can't open unattributed events
  })

  it('sums an employee’s rows across teams before ranking', () => {
    const rows = rankLeaderboard(
      viewer,
      people,
      [credit('a', 2), credit('a', 2), credit('b', 3)],
      metric
    )
    expect(rows[0]).toMatchObject({ fullName: 'Alice', value: 4, rank: 1 })
  })

  it('only lets the viewer open rows they are allowed to see', () => {
    const rows = rankLeaderboard(viewer, people, [credit('a', 1), credit('me', 1)], metric)
    expect(rows.find((r) => r.userId === 'a')?.canDrillDown).toBe(false)
    expect(rows.find((r) => r.userId === 'me')?.canDrillDown).toBe(true)
  })
})

describe('formatting', () => {
  it('labels London-local buckets without shifting them', () => {
    expect(formatBucket('2026-10-13T09:00:00', 'hour')).toBe('09:00')
    expect(formatBucket('2026-10-13T00:00:00', 'day')).toBe('Tue 13')
    expect(formatBucket('2026-03-01T00:00:00', 'month')).toBe('Mar')
  })

  it('links events to their source record', () => {
    expect(sourceHref({ sourceType: 'deal', sourceId: 'd1', subjectKey: 'deal:d1' })).toBe(
      '/deals/d1'
    )
    expect(
      sourceHref({
        sourceType: 'provisioning_service',
        sourceId: 's1',
        subjectKey: 'service:p1:bb',
      })
    ).toBe('/provisioning/p1')
    expect(sourceHref({ sourceType: 'synthetic', sourceId: 'x', subjectKey: 'x' })).toBeNull()
  })
})
