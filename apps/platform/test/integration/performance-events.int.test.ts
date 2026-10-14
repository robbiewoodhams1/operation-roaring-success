import { describe, it, expect } from 'vitest'
import { sql } from 'drizzle-orm'
import {
  inRollback,
  buildWorld,
  insertDeal,
  insertProvisioning,
  insertService,
  setServiceStatus,
  eventsFor,
  net,
  actAs,
  expectDbError,
  one,
  query,
  recordAt,
} from './fixtures'
import {
  getTotals,
  getCreditBreakdown,
  getEvents,
  getPeople,
  getCoverage,
  getTrend,
} from '@/lib/stats/queries'
import { METRICS, metricValue, getMetric } from '@/lib/stats/metrics'
import { periodRange, londonTime, comparisonRange } from '@/lib/stats/periods'

const ALL_TIME = { start: new Date('2000-01-01T00:00:00Z'), end: new Date('2100-01-01T00:00:00Z') }

describe('deals', () => {
  it('credits the sales agent with "opened" and the closing agent with "closed", once each', async () => {
    await inRollback(async (tx) => {
      const w = await buildWorld(tx)
      await actAs(tx, w.manager)
      const deal = await insertDeal(tx, w, { sales: w.alice, closing: w.bob, createdBy: w.manager })

      const opened = await eventsFor(tx, w.tenantId, 'deal_opened')
      const closed = await eventsFor(tx, w.tenantId, 'deal_closed')
      expect(opened).toHaveLength(1)
      expect(closed).toHaveLength(1)
      expect(opened[0]!.credited_user_id).toBe(w.alice)
      expect(closed[0]!.credited_user_id).toBe(w.bob)
      // The person who entered it is audited, not credited.
      expect(opened[0]!.actor_user_id).toBe(w.manager)
      expect(opened[0]!.team_id).toBe(w.teamA)
      expect(deal.created_by).toBe(w.manager)
    })
  })

  it('gives one opened and one closed credit when the same employee is both', async () => {
    await inRollback(async (tx) => {
      const w = await buildWorld(tx)
      await insertDeal(tx, w, { sales: w.alice, closing: w.alice, createdBy: w.alice })
      const totals = await getTotals(tx, w.tenantId, ALL_TIME, { kind: 'user', userId: w.alice })
      expect(metricValue(getMetric('deals_opened')!, totals)).toBe(1)
      expect(metricValue(getMetric('deals_closed')!, totals)).toBe(1)
    })
  })

  it('takes created_by from the session actor, not the submitted value', async () => {
    await inRollback(async (tx) => {
      const w = await buildWorld(tx)
      await actAs(tx, w.alice)
      const deal = await insertDeal(tx, w, {
        sales: w.alice,
        closing: w.alice,
        createdBy: w.manager,
      })
      expect(deal.created_by).toBe(w.alice)
    })
  })

  it('rejects a second deal with the same submission key', async () => {
    await inRollback(async (tx) => {
      const w = await buildWorld(tx)
      const key = crypto.randomUUID()
      await insertDeal(tx, w, {
        sales: w.alice,
        closing: w.bob,
        createdBy: w.alice,
        submissionKey: key,
      })
      const err = await expectDbError(tx, (sp) =>
        insertDeal(sp, w, {
          sales: w.alice,
          closing: w.bob,
          createdBy: w.alice,
          submissionKey: key,
        })
      )
      expect(String((err as { cause?: unknown }).cause ?? err)).toMatch(
        /deals_tenant_submission_key/
      )
      expect(await net(tx, w.tenantId, 'deal_opened')).toBe(1)
    })
  })

  it('never adds credit on edit, and keeps the original attribution when agents change', async () => {
    await inRollback(async (tx) => {
      const w = await buildWorld(tx)
      const deal = await insertDeal(tx, w, { sales: w.alice, closing: w.bob, createdBy: w.alice })
      await tx.execute(
        sql`update app.deals set sales_agent_id = ${w.dave}, closing_agent_id = ${w.dave}, soft_facts = 'edited'
             where id = ${deal.id}`
      )
      const opened = await eventsFor(tx, w.tenantId, 'deal_opened')
      expect(opened).toHaveLength(1)
      expect(opened[0]!.credited_user_id).toBe(w.alice)
    })
  })

  it('withdraws credit with an auditable reversal when a deal is deleted', async () => {
    await inRollback(async (tx) => {
      const w = await buildWorld(tx)
      const deal = await insertDeal(tx, w, { sales: w.alice, closing: w.bob, createdBy: w.alice })
      await tx.execute(sql`delete from app.deals where id = ${deal.id}`)
      const opened = await eventsFor(tx, w.tenantId, 'deal_opened')
      expect(opened.map((e) => e.kind)).toEqual(['award', 'reversal'])
      expect(opened[1]!.reverses_event_id).toBe(opened[0]!.id)
      expect(opened[1]!.credited_user_id).toBe(w.alice)
      expect(opened[1]!.team_id).toBe(w.teamA)
      expect(opened[1]!.reason).toBe('source_deleted')
      expect(await net(tx, w.tenantId, 'deal_opened')).toBe(0)
    })
  })

  it('refuses agents from another tenant', async () => {
    await inRollback(async (tx) => {
      const w = await buildWorld(tx)
      const err = await expectDbError(tx, (sp) =>
        insertDeal(sp, w, { sales: w.outsider, closing: w.alice, createdBy: w.alice })
      )
      expect(String((err as { cause?: unknown }).cause ?? err)).toMatch(/does not belong to tenant/)
    })
  })

  it('records unattributed credit when no stable agent is set', async () => {
    await inRollback(async (tx) => {
      const w = await buildWorld(tx)
      await insertDeal(tx, w, { sales: null, closing: null, createdBy: w.alice })
      const [opened] = await eventsFor(tx, w.tenantId, 'deal_opened')
      expect(opened!.credited_user_id).toBeNull()
      expect(opened!.attribution).toBe('unattributed')
      expect(opened!.team_id).toBeNull()
    })
  })
})

describe('provisioning services', () => {
  it('credits the assigned provisioner and audits the actual editor separately', async () => {
    await inRollback(async (tx) => {
      const w = await buildWorld(tx)
      const prov = await insertProvisioning(tx, w.tenantId, { provisioner: w.dave })
      const svc = await insertService(tx, prov, 'bb')
      await actAs(tx, w.alice)
      await setServiceStatus(tx, svc, 'applied')

      const [applied] = await eventsFor(tx, w.tenantId, 'service_applied')
      expect(applied!.credited_user_id).toBe(w.dave)
      expect(applied!.actor_user_id).toBe(w.alice)
      expect(applied!.team_id).toBe(w.teamB)
      expect(applied!.service_group).toBe('broadband')
      const row = await one<{ updated_by: string }>(
        tx,
        sql`select updated_by from app.provisioning_services where id = ${svc}`
      )
      expect(row.updated_by).toBe(w.alice)
    })
  })

  it('does not rewrite past credit when the provisioner is reassigned', async () => {
    await inRollback(async (tx) => {
      const w = await buildWorld(tx)
      const prov = await insertProvisioning(tx, w.tenantId, { provisioner: w.dave })
      const svc = await insertService(tx, prov, 'whc')
      await setServiceStatus(tx, svc, 'applied')
      await tx.execute(
        sql`update app.provisioning set provisioner_user_id = ${w.alice} where id = ${prov}`
      )
      await setServiceStatus(tx, svc, 'live')

      const applied = await eventsFor(tx, w.tenantId, 'service_applied')
      const live = await eventsFor(tx, w.tenantId, 'service_live')
      expect(applied[0]!.credited_user_id).toBe(w.dave)
      expect(live[0]!.credited_user_id).toBe(w.alice)
    })
  })

  it('counts a retried service once per milestone', async () => {
    await inRollback(async (tx) => {
      const w = await buildWorld(tx)
      const prov = await insertProvisioning(tx, w.tenantId, { provisioner: w.dave })
      const first = await insertService(tx, prov, 'bb', 1)
      await setServiceStatus(tx, first, 'applied')
      await setServiceStatus(tx, first, 'cancelled')
      const retry = await insertService(tx, prov, 'bb', 2)
      await setServiceStatus(tx, retry, 'applied')
      await setServiceStatus(tx, retry, 'live')

      const subject = `service:${prov}:bb`
      expect(await net(tx, w.tenantId, 'service_applied', subject)).toBe(1)
      expect(await net(tx, w.tenantId, 'service_live', subject)).toBe(1)
      expect(await eventsFor(tx, w.tenantId, 'service_applied')).toHaveLength(1)
    })
  })

  it('keeps applied credit when an applied service is later cancelled', async () => {
    await inRollback(async (tx) => {
      const w = await buildWorld(tx)
      const prov = await insertProvisioning(tx, w.tenantId, { provisioner: w.dave })
      const svc = await insertService(tx, prov, 'nfon')
      await setServiceStatus(tx, svc, 'applied')
      await setServiceStatus(tx, svc, 'cancelled')
      expect(await net(tx, w.tenantId, 'service_applied')).toBe(1)
    })
  })

  it('reverses "applied" when the status is corrected back to not applied', async () => {
    await inRollback(async (tx) => {
      const w = await buildWorld(tx)
      const prov = await insertProvisioning(tx, w.tenantId, { provisioner: w.dave })
      const svc = await insertService(tx, prov, 'bb')
      await setServiceStatus(tx, svc, 'applied')
      await setServiceStatus(tx, svc, 'not_applied')
      await setServiceStatus(tx, svc, 'applied')

      const events = await eventsFor(tx, w.tenantId, 'service_applied')
      expect(events.map((e) => `${e.kind}#${e.sequence}`)).toEqual([
        'award#1',
        'reversal#1',
        'award#2',
      ])
      expect(await net(tx, w.tenantId, 'service_applied')).toBe(1)
    })
  })

  it('reverses "live" when a service leaves live, and re-awards only once on return', async () => {
    await inRollback(async (tx) => {
      const w = await buildWorld(tx)
      const prov = await insertProvisioning(tx, w.tenantId, { provisioner: w.dave })
      const svc = await insertService(tx, prov, 'mpf_voice')
      await setServiceStatus(tx, svc, 'live')
      await setServiceStatus(tx, svc, 'delayed')
      await setServiceStatus(tx, svc, 'live')
      await setServiceStatus(tx, svc, 'live')
      expect(await net(tx, w.tenantId, 'service_live')).toBe(1)
      expect((await eventsFor(tx, w.tenantId, 'service_live')).map((e) => e.kind)).toEqual([
        'award',
        'reversal',
        'award',
      ])
    })
  })

  it('records unattributed credit when no provisioner is assigned', async () => {
    await inRollback(async (tx) => {
      const w = await buildWorld(tx)
      const prov = await insertProvisioning(tx, w.tenantId)
      const svc = await insertService(tx, prov, 'bb')
      await setServiceStatus(tx, svc, 'applied')
      const [e] = await eventsFor(tx, w.tenantId, 'service_applied')
      expect(e!.attribution).toBe('unattributed')
    })
  })

  it('withdraws service credit when the provisioning record is deleted', async () => {
    await inRollback(async (tx) => {
      const w = await buildWorld(tx)
      const prov = await insertProvisioning(tx, w.tenantId, { provisioner: w.dave })
      const svc = await insertService(tx, prov, 'bb')
      await setServiceStatus(tx, svc, 'live')
      await tx.execute(sql`delete from app.provisioning where id = ${prov}`)
      expect(await net(tx, w.tenantId, 'service_live')).toBe(0)
      expect(await net(tx, w.tenantId, 'service_applied')).toBe(0)
    })
  })
})

describe('router dispatch', () => {
  it('counts the first transition to "yes" once, credited to the router assignee', async () => {
    await inRollback(async (tx) => {
      const w = await buildWorld(tx)
      const prov = await insertProvisioning(tx, w.tenantId, { routerAssignee: w.bob })
      await actAs(tx, w.manager)
      await tx.execute(
        sql`update app.provisioning set router_dispatched = 'yes' where id = ${prov}`
      )
      await tx.execute(
        sql`update app.provisioning set router_tracking_number = 'SYN123' where id = ${prov}`
      )
      await tx.execute(
        sql`update app.provisioning set router_dispatched = 'yes' where id = ${prov}`
      )

      const events = await eventsFor(tx, w.tenantId, 'router_dispatched')
      expect(events).toHaveLength(1)
      expect(events[0]!.credited_user_id).toBe(w.bob)
      expect(events[0]!.actor_user_id).toBe(w.manager)
    })
  })

  it('records an auditable reversal when a dispatch is undone', async () => {
    await inRollback(async (tx) => {
      const w = await buildWorld(tx)
      const prov = await insertProvisioning(tx, w.tenantId, { routerAssignee: w.bob })
      await tx.execute(
        sql`update app.provisioning set router_dispatched = 'yes' where id = ${prov}`
      )
      await tx.execute(sql`update app.provisioning set router_dispatched = 'no' where id = ${prov}`)
      const events = await eventsFor(tx, w.tenantId, 'router_dispatched')
      expect(events.map((e) => e.kind)).toEqual(['award', 'reversal'])
      expect(events[1]!.reason).toBe('dispatch_reversed')
      expect(await net(tx, w.tenantId, 'router_dispatched')).toBe(0)
    })
  })
})

describe('other workflows', () => {
  it('credits a resolved fault to its assignee and reverses on reopen', async () => {
    await inRollback(async (tx) => {
      const w = await buildWorld(tx)
      const fault = await one<{ id: string }>(
        tx,
        sql`insert into app.faults (tenant_id, title, type, status, assigned_to, created_by)
            values (${w.tenantId}, 'Synthetic fault', 'bb', 'outstanding', ${w.dave}, ${w.alice}) returning id`
      )
      await tx.execute(
        sql`update app.faults set status = 'resolved', resolved_at = now() where id = ${fault.id}`
      )
      await tx.execute(
        sql`update app.faults set status = 'in_progress', resolved_at = null where id = ${fault.id}`
      )
      const events = await eventsFor(tx, w.tenantId, 'fault_resolved')
      expect(events.map((e) => e.kind)).toEqual(['award', 'reversal'])
      expect(events[0]!.credited_user_id).toBe(w.dave)
    })
  })

  it('records welcome-call outcomes once per call', async () => {
    await inRollback(async (tx) => {
      const w = await buildWorld(tx)
      const prov = await insertProvisioning(tx, w.tenantId)
      await tx.execute(
        sql`update app.provisioning set wc1_outcome = 'no_answer' where id = ${prov}`
      )
      await tx.execute(sql`update app.provisioning set wc1_outcome = 'answered' where id = ${prov}`)
      expect(await eventsFor(tx, w.tenantId, 'welcome_call_logged')).toHaveLength(1)
    })
  })
})

describe('append-only event log', () => {
  it('refuses updates and deletes', async () => {
    await inRollback(async (tx) => {
      const w = await buildWorld(tx)
      await insertDeal(tx, w, { sales: w.alice, closing: w.bob, createdBy: w.alice })
      const upd = await expectDbError(tx, (sp) =>
        sp.execute(
          sql`update app.performance_events set credited_user_id = null where tenant_id = ${w.tenantId}`
        )
      )
      const del = await expectDbError(tx, (sp) =>
        sp.execute(sql`delete from app.performance_events where tenant_id = ${w.tenantId}`)
      )
      expect(String((upd as { cause?: unknown }).cause ?? upd)).toMatch(/append-only/)
      expect(String((del as { cause?: unknown }).cause ?? del)).toMatch(/append-only/)
    })
  })
})

describe('teams', () => {
  it('reconciles team totals with member credit and leaves unattributed credit out of teams', async () => {
    await inRollback(async (tx) => {
      const w = await buildWorld(tx)
      await insertDeal(tx, w, { sales: w.alice, closing: w.bob, createdBy: w.alice })
      await insertDeal(tx, w, { sales: w.bob, closing: w.dave, createdBy: w.bob })
      await insertDeal(tx, w, { sales: w.manager, closing: null, createdBy: w.manager })

      const opened = getMetric('deals_opened')!
      const closed = getMetric('deals_closed')!
      const breakdown = await getCreditBreakdown(tx, w.tenantId, ALL_TIME)
      const teamA = await getTotals(tx, w.tenantId, ALL_TIME, { kind: 'team', teamId: w.teamA })
      const teamB = await getTotals(tx, w.tenantId, ALL_TIME, { kind: 'team', teamId: w.teamB })
      const tenant = await getTotals(tx, w.tenantId, ALL_TIME, { kind: 'tenant' })
      const unattributed = await getTotals(tx, w.tenantId, ALL_TIME, { kind: 'unattributed' })

      for (const def of [opened, closed]) {
        const memberSum = (team: string) =>
          metricValue(
            def,
            breakdown.filter((r) => r.teamId === team)
          )
        expect(metricValue(def, teamA)).toBe(memberSum(w.teamA))
        expect(metricValue(def, teamB)).toBe(memberSum(w.teamB))
        const noTeam = metricValue(
          def,
          breakdown.filter((r) => r.teamId === null)
        )
        expect(metricValue(def, tenant)).toBe(
          metricValue(def, teamA) + metricValue(def, teamB) + noTeam
        )
      }
      expect(metricValue(opened, teamA)).toBe(2)
      expect(metricValue(closed, teamB)).toBe(1)
      expect(metricValue(closed, unattributed)).toBe(1)
    })
  })

  it('keeps past credit with the old team after an employee transfers', async () => {
    await inRollback(async (tx) => {
      const w = await buildWorld(tx)
      // Pretend Alice has been in Team A for a while.
      await tx.execute(
        sql`update app.user_team_memberships set valid_from = now() - interval '30 days' where user_id = ${w.alice}`
      )
      await recordAt(tx, {
        tenantId: w.tenantId,
        eventType: 'deal_opened',
        subject: 'synthetic:before-move',
        credited: w.alice,
        occurredAt: new Date(Date.now() - 2 * 86_400_000),
      })
      await tx.execute(sql`update app.users set team_id = ${w.teamB} where id = ${w.alice}`)
      await insertDeal(tx, w, { sales: w.alice, closing: w.alice, createdBy: w.alice })

      const opened = getMetric('deals_opened')!
      const teamA = await getTotals(tx, w.tenantId, ALL_TIME, { kind: 'team', teamId: w.teamA })
      const teamB = await getTotals(tx, w.tenantId, ALL_TIME, { kind: 'team', teamId: w.teamB })
      const alice = await getTotals(tx, w.tenantId, ALL_TIME, { kind: 'user', userId: w.alice })
      expect(metricValue(opened, teamA)).toBe(1)
      expect(metricValue(opened, teamB)).toBe(1)
      expect(metricValue(opened, alice)).toBe(2)

      const history = await query<{ team_id: string; valid_to: Date | null }>(
        tx,
        sql`select team_id, valid_to from app.user_team_memberships where user_id = ${w.alice} order by valid_from`
      )
      expect(history.map((h) => [h.team_id, h.valid_to === null])).toEqual([
        [w.teamA, false],
        [w.teamB, true],
      ])
    })
  })

  it('refuses a team from another tenant', async () => {
    await inRollback(async (tx) => {
      const w = await buildWorld(tx)
      const err = await expectDbError(tx, (sp) =>
        sp.execute(sql`update app.users set team_id = ${w.teamA} where id = ${w.outsider}`)
      )
      expect(String((err as { cause?: unknown }).cause ?? err)).toMatch(/does not belong to tenant/)
    })
  })

  it('lists inactive employees with their status so historical boards stay complete', async () => {
    await inRollback(async (tx) => {
      const w = await buildWorld(tx)
      await insertDeal(tx, w, { sales: w.erin, closing: w.erin, createdBy: w.alice })
      const people = await getPeople(tx, w.tenantId)
      const breakdown = await getCreditBreakdown(tx, w.tenantId, ALL_TIME)
      expect(people.find((p) => p.id === w.erin)?.isActive).toBe(false)
      expect(breakdown.some((r) => r.userId === w.erin && r.total === 1)).toBe(true)
    })
  })
})

describe('tenant isolation', () => {
  it('never returns another tenant’s credit', async () => {
    await inRollback(async (tx) => {
      const w = await buildWorld(tx)
      await insertDeal(tx, w, { sales: w.alice, closing: w.alice, createdBy: w.alice })
      await insertDeal(
        tx,
        { tenantId: w.otherTenantId, customerId: w.otherCustomerId },
        { sales: w.outsider, closing: w.outsider, createdBy: w.outsider }
      )
      const mine = await getTotals(tx, w.tenantId, ALL_TIME, { kind: 'tenant' })
      const theirs = await getTotals(tx, w.otherTenantId, ALL_TIME, { kind: 'tenant' })
      expect(metricValue(getMetric('deals_opened')!, mine)).toBe(1)
      expect(metricValue(getMetric('deals_opened')!, theirs)).toBe(1)
      const leak = await getTotals(tx, w.tenantId, ALL_TIME, { kind: 'user', userId: w.outsider })
      expect(leak).toEqual([])
      const page = await getEvents(tx, w.tenantId, { scope: { kind: 'tenant' }, limit: 100 })
      expect(page.events.every((e) => e.creditedUserId !== w.outsider)).toBe(true)
    })
  })
})

describe('reporting periods against the database', () => {
  it('assigns events either side of London midnight to the right day across the spring DST change', async () => {
    await inRollback(async (tx) => {
      const w = await buildWorld(tx)
      // 29 Mar 2026: clocks go forward at 01:00 GMT. London midnight on the 30th is 23:00 UTC on the 29th.
      const lastMoment = new Date(londonTime(2026, 3, 30).getTime() - 1)
      const firstMoment = londonTime(2026, 3, 30)
      await recordAt(tx, {
        tenantId: w.tenantId,
        eventType: 'deal_opened',
        subject: 's:1',
        credited: w.alice,
        occurredAt: lastMoment,
      })
      await recordAt(tx, {
        tenantId: w.tenantId,
        eventType: 'deal_opened',
        subject: 's:2',
        credited: w.alice,
        occurredAt: firstMoment,
      })

      const opened = getMetric('deals_opened')!
      const noon30 = londonTime(2026, 3, 30, 12)
      const today = await getTotals(tx, w.tenantId, periodRange('today', noon30), {
        kind: 'user',
        userId: w.alice,
      })
      const yesterday = await getTotals(tx, w.tenantId, comparisonRange('today', noon30), {
        kind: 'user',
        userId: w.alice,
      })
      expect(metricValue(opened, today)).toBe(1)
      // The comparison window only runs to 12:00 on the 29th, so 23:59 isn't in it.
      expect(metricValue(opened, yesterday)).toBe(0)
      const fullYesterday = await getTotals(
        tx,
        w.tenantId,
        { start: londonTime(2026, 3, 29), end: londonTime(2026, 3, 30) },
        { kind: 'user', userId: w.alice }
      )
      expect(metricValue(opened, fullYesterday)).toBe(1)

      const trend = await getTrend(tx, w.tenantId, periodRange('mtd', noon30), 'day', {
        kind: 'user',
        userId: w.alice,
      })
      expect(trend.map((t) => t.bucket)).toEqual(['2026-03-29T00:00:00', '2026-03-30T00:00:00'])
    })
  })

  it('nets a reversal against the period of the original award', async () => {
    await inRollback(async (tx) => {
      const w = await buildWorld(tx)
      const prov = await insertProvisioning(tx, w.tenantId, { routerAssignee: w.bob })
      await tx.execute(
        sql`update app.provisioning set router_dispatched = 'yes' where id = ${prov}`
      )
      await tx.execute(sql`update app.provisioning set router_dispatched = 'no' where id = ${prov}`)
      const [award, reversal] = await eventsFor(tx, w.tenantId, 'router_dispatched')
      expect(new Date(reversal!.effective_at).getTime()).toBe(
        new Date(award!.effective_at).getTime()
      )
    })
  })
})

describe('event listings', () => {
  it('paginates newest first without gaps or repeats', async () => {
    await inRollback(async (tx) => {
      const w = await buildWorld(tx)
      for (let i = 0; i < 7; i++) {
        await recordAt(tx, {
          tenantId: w.tenantId,
          eventType: 'deal_opened',
          subject: `s:${i}`,
          credited: w.alice,
          occurredAt: new Date(Date.UTC(2026, 9, 1, 9, i)),
        })
      }
      const seen: string[] = []
      let cursor = null
      for (let pageNo = 0; pageNo < 5; pageNo++) {
        const page: Awaited<ReturnType<typeof getEvents>> = await getEvents(tx, w.tenantId, {
          scope: { kind: 'credited', userId: w.alice },
          limit: 3,
          cursor,
        })
        seen.push(...page.events.map((e) => e.occurredAt))
        cursor = page.nextCursor
        if (!cursor) break
      }
      expect(seen).toHaveLength(7)
      expect(new Set(seen).size).toBe(7)
      expect([...seen].sort().reverse()).toEqual(seen)
    })
  })

  it('serves personal and team totals from the reporting indexes at volume', async () => {
    await inRollback(async (tx) => {
      const w = await buildWorld(tx)
      const people = [w.alice, w.bob, w.carol, w.dave, w.manager, w.erin]
      // ~20k synthetic events spread over three years, then fresh planner statistics.
      await tx.execute(sql`
        insert into app.performance_events (tenant_id, event_type, kind, sequence, source_type, source_id,
          subject_key, credited_user_id, team_id, attribution, origin, occurred_at, effective_at, idempotency_key)
        select ${w.tenantId}, 'deal_opened', 'award', 1, 'synthetic', gen_random_uuid(), 'perf:' || g,
               (${sql.raw(`array['${people.join("','")}']::uuid[]`)})[1 + g % 6],
               case when g % 2 = 0 then ${w.teamA}::uuid else ${w.teamB}::uuid end,
               'recorded', 'live', ts, ts, 'perf:' || g
          from generate_series(1, 20000) g,
               lateral (select now() - (g || ' hours')::interval * 1.3 as ts) t`)
      await tx.execute(sql`analyze app.performance_events`)

      const explain = async (where: ReturnType<typeof sql>) =>
        (
          await query<{ 'QUERY PLAN': string }>(
            tx,
            sql`explain select event_type, service_type, sum(delta) from app.performance_events e
                 where e.tenant_id = ${w.tenantId} and ${where}
                   and e.effective_at >= now() - interval '7 days' and e.effective_at < now()
                 group by 1, 2`
          )
        )
          .map((p) => p['QUERY PLAN'])
          .join('\n')

      const personal = await explain(sql`e.credited_user_id = ${w.alice}`)
      const team = await explain(sql`e.team_id = ${w.teamA}`)
      expect(personal).toMatch(/performance_events_credited_effective/)
      expect(team).toMatch(/performance_events_team_effective/)
      expect(personal + team).not.toMatch(/Seq Scan on performance_events/)
    })
  })
})

describe('historical backfill', () => {
  it('rebuilds credit only from timestamped evidence, unattributed where no stable id exists', async () => {
    await inRollback(async (tx) => {
      const w = await buildWorld(tx)
      // Make history: drop the live-tracking row so everything counts as "before tracking".
      await tx.execute(sql`delete from app.performance_tracking where tenant_id = ${w.tenantId}`)
      await tx.execute(
        sql`insert into app.performance_tracking (tenant_id, live_from) values (${w.tenantId}, now() + interval '1 hour')`
      )
      await tx.execute(sql`alter table app.deals disable trigger performance_events`)
      await tx.execute(
        sql`alter table app.provisioning_services disable trigger performance_events`
      )
      const legacy = await insertDeal(tx, w, { sales: null, closing: null, createdBy: w.alice })
      const mapped = await insertDeal(tx, w, { sales: w.alice, closing: w.bob, createdBy: w.alice })
      const prov = await insertProvisioning(tx, w.tenantId)
      const svc = await insertService(tx, prov, 'mpf_broadband')
      await tx.execute(sql`alter table app.deals enable trigger performance_events`)
      await tx.execute(sql`alter table app.provisioning_services enable trigger performance_events`)
      // An audited status change from the past, with no provisioner on record.
      await tx.execute(
        sql`insert into app.audit_logs (table_name, record_id, action, old_data, new_data, changed_by, changed_at)
            values ('provisioning_services', ${svc}, 'UPDATE',
                    jsonb_build_object('status', 'not_applied', 'provisioning_id', ${prov}::text, 'service_type', 'mpf_broadband'),
                    jsonb_build_object('status', 'applied', 'provisioning_id', ${prov}::text, 'service_type', 'mpf_broadband'),
                    ${w.manager}, now() - interval '3 days')`
      )

      await tx.execute(sql`select app.backfill_performance_events(${w.tenantId})`)
      await tx.execute(sql`select app.backfill_performance_events(${w.tenantId})`) // idempotent

      const opened = await eventsFor(tx, w.tenantId, 'deal_opened')
      expect(opened).toHaveLength(2)
      expect(opened.every((e) => e.origin === 'backfill')).toBe(true)
      expect(opened.find((e) => e.subject_key === `deal:${legacy.id}`)?.attribution).toBe(
        'unattributed'
      )
      expect(opened.find((e) => e.subject_key === `deal:${mapped.id}`)?.credited_user_id).toBe(
        w.alice
      )

      const applied = await eventsFor(tx, w.tenantId, 'service_applied')
      expect(applied).toHaveLength(1)
      expect(applied[0]!.attribution).toBe('unattributed')
      // The editor is audited as the actor, never promoted to the credited employee.
      expect(applied[0]!.actor_user_id).toBe(w.manager)

      const coverage = await getCoverage(tx, w.tenantId)
      expect(coverage.backfilledAt).not.toBeNull()
      const totals = await getTotals(tx, w.tenantId, ALL_TIME, { kind: 'tenant' })
      const row = totals.find((t) => t.eventType === 'deal_opened')!
      expect(row.backfilled).toBe(2)
      expect(row.unattributed).toBe(1)
    })
  })
})

describe('metric registry against recorded events', () => {
  it('maps every service event to exactly one grouped metric', async () => {
    await inRollback(async (tx) => {
      const w = await buildWorld(tx)
      const prov = await insertProvisioning(tx, w.tenantId, { provisioner: w.dave })
      for (const type of ['bb', 'mpf_broadband', 'whc', 'mpf_voice', 'nfon']) {
        const svc = await insertService(tx, prov, type)
        await setServiceStatus(tx, svc, 'applied')
      }
      const totals = await getTotals(tx, w.tenantId, ALL_TIME, { kind: 'user', userId: w.dave })
      expect(metricValue(getMetric('broadband_applied')!, totals)).toBe(2)
      expect(metricValue(getMetric('voice_applied')!, totals)).toBe(3)
      const perType = METRICS.filter(
        (m) => m.group === 'provisioning_detail' && m.key.endsWith('_applied')
      )
      expect(perType.reduce((s, m) => s + metricValue(m, totals), 0)).toBe(5)
    })
  })
})
