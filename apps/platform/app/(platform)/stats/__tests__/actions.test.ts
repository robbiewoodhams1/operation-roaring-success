import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getMetricEvents, getActivityFeed } from '../actions'

const { chain, mockDb, mockRequireUser, mockGetViewer, mockGetEvents } = vi.hoisted(() => {
  const chain: any = {}
  for (const m of ['from', 'where']) chain[m] = vi.fn().mockReturnValue(chain)
  chain.limit = vi.fn().mockResolvedValue([])
  const mockDb = { select: vi.fn().mockReturnValue(chain) }
  return {
    chain,
    mockDb,
    mockRequireUser: vi.fn(),
    mockGetViewer: vi.fn(),
    mockGetEvents: vi.fn(),
  }
})

vi.mock('@roaring/db', () => ({ db: mockDb, users: {} }))
vi.mock('@roaring/auth', () => ({ requireUser: mockRequireUser }))
vi.mock('drizzle-orm', () => ({
  eq: vi.fn((...a: any[]) => ({ op: 'eq', a })),
  and: vi.fn((...a: any[]) => ({ op: 'and', a })),
}))
vi.mock('@/lib/stats/board', () => ({ getViewer: mockGetViewer }))
vi.mock('@/lib/stats/queries', () => ({ getEvents: mockGetEvents }))

const ME = '11111111-1111-4111-8111-111111111111'
const COLLEAGUE = '22222222-2222-4222-8222-222222222222'
const TEAM = '33333333-3333-4333-8333-333333333333'
const OTHER_TEAM = '44444444-4444-4444-8444-444444444444'

function as(role: string, teamId: string | null = TEAM) {
  mockRequireUser.mockResolvedValue({ id: ME, tenantId: 'tenant-1', role })
  mockGetViewer.mockResolvedValue({ id: ME, role, teamId })
}

beforeEach(() => {
  vi.clearAllMocks()
  chain.from.mockReturnValue(chain)
  chain.where.mockReturnValue(chain)
  chain.limit.mockResolvedValue([])
  mockDb.select.mockReturnValue(chain)
  mockGetEvents.mockResolvedValue({ events: [], nextCursor: null })
})

describe('getMetricEvents', () => {
  it('requires a signed-in user', async () => {
    mockRequireUser.mockRejectedValue(new Error('NEXT_REDIRECT'))
    await expect(
      getMetricEvents({ metricKey: 'deals_opened', period: 'today', scope: { kind: 'tenant' } })
    ).rejects.toThrow('NEXT_REDIRECT')
    expect(mockGetEvents).not.toHaveBeenCalled()
  })

  it('lets an agent see their own credited events, tenant-scoped', async () => {
    as('agent')
    chain.limit.mockResolvedValue([{ id: ME, teamId: TEAM }])
    const result = await getMetricEvents({
      metricKey: 'deals_opened',
      period: 'mtd',
      scope: { kind: 'user', userId: ME },
    })
    expect(result.ok).toBe(true)
    const [, tenantId, options] = mockGetEvents.mock.calls[0]!
    expect(tenantId).toBe('tenant-1')
    expect(options.scope).toEqual({ kind: 'credited', userId: ME })
    expect(options.match).toEqual({ eventType: 'deal_opened' })
  })

  it('stops an agent viewing a colleague’s events', async () => {
    as('agent')
    chain.limit.mockResolvedValue([{ id: COLLEAGUE, teamId: TEAM }])
    const result = await getMetricEvents({
      metricKey: 'deals_opened',
      period: 'mtd',
      scope: { kind: 'user', userId: COLLEAGUE },
    })
    expect(result).toEqual({ ok: false, error: expect.stringMatching(/can’t view/) })
    expect(mockGetEvents).not.toHaveBeenCalled()
  })

  it('treats an employee from another tenant as not found', async () => {
    as('admin', null)
    chain.limit.mockResolvedValue([]) // the tenant-scoped lookup finds nobody
    const result = await getMetricEvents({
      metricKey: 'deals_opened',
      period: 'mtd',
      scope: { kind: 'user', userId: COLLEAGUE },
    })
    expect(result.ok).toBe(false)
    expect(mockGetEvents).not.toHaveBeenCalled()
  })

  it('lets a team leader open their own team but not another', async () => {
    as('team_leader')
    expect(
      (
        await getMetricEvents({
          metricKey: 'voice_live',
          period: 'wtd',
          scope: { kind: 'team', teamId: TEAM },
        })
      ).ok
    ).toBe(true)
    expect(
      (
        await getMetricEvents({
          metricKey: 'voice_live',
          period: 'wtd',
          scope: { kind: 'team', teamId: OTHER_TEAM },
        })
      ).ok
    ).toBe(false)
  })

  it('keeps unattributed and company-wide events to managers and above', async () => {
    as('agent')
    for (const scope of [{ kind: 'unattributed' as const }, { kind: 'tenant' as const }]) {
      expect((await getMetricEvents({ metricKey: 'deals_opened', period: 'ytd', scope })).ok).toBe(
        false
      )
    }
    as('manager', null)
    for (const scope of [{ kind: 'unattributed' as const }, { kind: 'tenant' as const }]) {
      expect((await getMetricEvents({ metricKey: 'deals_opened', period: 'ytd', scope })).ok).toBe(
        true
      )
    }
  })

  it('refuses metrics that are not active yet', async () => {
    as('admin', null)
    const result = await getMetricEvents({
      metricKey: 'routers_dispatched',
      period: 'today',
      scope: { kind: 'tenant' },
    })
    expect(result.ok).toBe(false)
    expect(mockGetEvents).not.toHaveBeenCalled()
  })

  it('refuses unknown periods and malformed ids', async () => {
    as('admin', null)
    expect(
      (
        await getMetricEvents({
          metricKey: 'deals_opened',
          period: 'forever',
          scope: { kind: 'tenant' },
        })
      ).ok
    ).toBe(false)
    expect(
      (
        await getMetricEvents({
          metricKey: 'deals_opened',
          period: 'today',
          scope: { kind: 'user', userId: "x' or 1=1" },
        })
      ).ok
    ).toBe(false)
  })

  it('ignores a malformed pagination cursor', async () => {
    as('admin', null)
    await getMetricEvents({
      metricKey: 'deals_opened',
      period: 'today',
      scope: { kind: 'tenant' },
      cursor: { occurredAt: 'nope', recordedAt: 'nope', id: 'nope' },
    })
    expect(mockGetEvents.mock.calls[0]![2].cursor).toBeNull()
  })
})

describe('getActivityFeed', () => {
  it('shows an agent only activity involving them', async () => {
    as('agent')
    await getActivityFeed()
    expect(mockGetEvents.mock.calls[0]![2].scope).toEqual({ kind: 'involving', userId: ME })
  })

  it('shows a team leader their team plus themselves', async () => {
    as('team_leader')
    await getActivityFeed()
    expect(mockGetEvents.mock.calls[0]![2].scope).toEqual({
      kind: 'team',
      teamId: TEAM,
      userId: ME,
    })
  })

  it('shows managers everything in their tenant only', async () => {
    as('manager', null)
    await getActivityFeed()
    const [, tenantId, options] = mockGetEvents.mock.calls[0]!
    expect(tenantId).toBe('tenant-1')
    expect(options.scope).toEqual({ kind: 'tenant' })
  })

  it('only lists event types behind visible metrics', async () => {
    as('manager', null)
    await getActivityFeed()
    expect(mockGetEvents.mock.calls[0]![2].eventTypes).not.toContain('router_dispatched')
  })
})
