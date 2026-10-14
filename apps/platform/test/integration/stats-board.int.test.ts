import { describe, it, expect } from 'vitest'
import { sql } from 'drizzle-orm'
import {
  inRollback,
  buildWorld,
  insertDeal,
  insertProvisioning,
  insertService,
  setServiceStatus,
  recordAt,
  dbNow,
} from './fixtures'
import { buildLeaderboard, buildPersonalBoard, buildTeamBoard } from '@/lib/stats/board'
import { getMetric } from '@/lib/stats/metrics'
import { londonTime } from '@/lib/stats/periods'

const value = (figures: { key: string; value: number }[], key: string) =>
  figures.find((f) => f.key === key)?.value

describe('Stats Board views against the database', () => {
  it('shows an employee exactly their own credit, with no baseline before tracking began', async () => {
    await inRollback(async (tx) => {
      const w = await buildWorld(tx)
      await insertDeal(tx, w, { sales: w.alice, closing: w.bob, createdBy: w.manager })
      await insertDeal(tx, w, { sales: w.alice, closing: w.alice, createdBy: w.alice })
      const prov = await insertProvisioning(tx, w.tenantId, { provisioner: w.alice })
      const svc = await insertService(tx, prov, 'whc')
      await setServiceStatus(tx, svc, 'applied')

      const board = await buildPersonalBoard(
        { id: w.alice, role: 'agent', teamId: w.teamA },
        w.tenantId,
        'today',
        await dbNow(tx),
        tx
      )
      expect(value(board.figures, 'deals_opened')).toBe(2)
      expect(value(board.figures, 'deals_closed')).toBe(1)
      expect(value(board.figures, 'voice_applied')).toBe(1)
      expect(value(board.figures, 'broadband_applied')).toBe(0)
      // The synthetic tenant's tracking started moments ago — yesterday is no baseline.
      expect(board.figures.find((f) => f.key === 'deals_opened')?.comparison.kind).toBe(
        'no_baseline'
      )
      expect(board.person.teamName).toBe('Synthetic Team A')
    })
  })

  it('reconciles team totals, member rows and the company comparison', async () => {
    await inRollback(async (tx) => {
      const w = await buildWorld(tx)
      await insertDeal(tx, w, { sales: w.alice, closing: w.bob, createdBy: w.alice })
      await insertDeal(tx, w, { sales: w.bob, closing: w.dave, createdBy: w.bob })
      await insertDeal(tx, w, { sales: null, closing: w.manager, createdBy: w.manager })
      // Alice later moves to team B; her credit above stays with team A.
      await tx.execute(sql`update app.users set team_id = ${w.teamB} where id = ${w.alice}`)

      const viewer = { id: w.carol, role: 'team_leader' as const, teamId: w.teamA }
      const board = await buildTeamBoard(viewer, w.tenantId, 'today', w.teamA, await dbNow(tx), tx)

      expect(value(board.figures, 'deals_opened')).toBe(2)
      const memberSum = board.members.reduce((s, m) => s + (m.values.deals_opened ?? 0), 0)
      expect(memberSum).toBe(2)
      const alice = board.members.find((m) => m.userId === w.alice)!
      expect(alice.currentMember).toBe(false)
      expect(alice.canDrillDown).toBe(false) // she has left Carol's team
      expect(board.members.find((m) => m.userId === w.bob)?.canDrillDown).toBe(true)
      expect(board.canDrillDownTeam).toBe(true)

      const companyOpened = board.comparison.reduce((s, r) => s + (r.values.deals_opened ?? 0), 0)
      const companyClosed = board.comparison.reduce((s, r) => s + (r.values.deals_closed ?? 0), 0)
      expect(companyOpened).toBe(3)
      expect(companyClosed).toBe(3)
      expect(board.comparison.find((r) => r.name === 'Unattributed')?.values.deals_opened).toBe(1)
      expect(board.comparison.find((r) => r.name === 'No team')?.values.deals_closed).toBe(1)
    })
  })

  it('ranks the leaderboard by the chosen metric and period only', async () => {
    await inRollback(async (tx) => {
      const w = await buildWorld(tx)
      const noon = londonTime(2026, 10, 13, 12)
      await recordAt(tx, {
        tenantId: w.tenantId,
        eventType: 'deal_closed',
        subject: 'l:1',
        credited: w.dave,
        occurredAt: new Date(noon.getTime() - 3_600_000),
      })
      await recordAt(tx, {
        tenantId: w.tenantId,
        eventType: 'deal_closed',
        subject: 'l:2',
        credited: w.dave,
        occurredAt: new Date(noon.getTime() - 7_200_000),
      })
      await recordAt(tx, {
        tenantId: w.tenantId,
        eventType: 'deal_closed',
        subject: 'l:3',
        credited: w.erin,
        occurredAt: new Date(noon.getTime() - 3_600_000),
      })
      // Yesterday — outside "today".
      await recordAt(tx, {
        tenantId: w.tenantId,
        eventType: 'deal_closed',
        subject: 'l:4',
        credited: w.erin,
        occurredAt: londonTime(2026, 10, 12, 15),
      })
      // A different metric — must not count.
      await recordAt(tx, {
        tenantId: w.tenantId,
        eventType: 'deal_opened',
        subject: 'l:5',
        credited: w.bob,
        occurredAt: new Date(noon.getTime() - 3_600_000),
      })

      const board = await buildLeaderboard(
        { id: w.alice, role: 'agent', teamId: w.teamA },
        w.tenantId,
        'today',
        getMetric('deals_closed')!,
        noon,
        tx
      )
      const ranked = board.rows.filter((r) => r.rank !== null)
      expect(ranked.map((r) => [r.userId, r.value, r.rank])).toEqual([
        [w.dave, 2, 1],
        [w.erin, 1, 2],
      ])
      expect(ranked[1]!.isActive).toBe(false) // Erin is inactive but still listed
      expect(board.rows.find((r) => r.isViewer)).toMatchObject({
        userId: w.alice,
        rank: null,
        value: 0,
      })
    })
  })
})
