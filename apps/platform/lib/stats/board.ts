/**
 * Assembles Stats Board view data on the server. Everything returned is plain,
 * serialisable data that the viewer is allowed to see.
 */
import { db, users } from '@roaring/db'
import { eq } from 'drizzle-orm'
import type { AuthUser } from '@roaring/auth'
import { compare, includesHistory, type Comparison, type Coverage } from './compare'
import {
  ACTIVE_METRICS,
  METRICS,
  matches,
  metricValue,
  type MetricDefinition,
  type DeltaRow,
} from './metrics'
import { comparisonRange, periodRange, trendBucket, type Period, type Range } from './periods'
import {
  getCoverage,
  getCreditBreakdown,
  getPeople,
  getTeams,
  getTotals,
  getTrend,
  type CreditScope,
  type Executor,
  type Team,
  type TotalsRow,
  type TrendRow,
} from './queries'
import { canViewTeamEvents, canViewUserEvents, hasFullVisibility, type Viewer } from './permissions'
import { rankLeaderboard, type LeaderboardRow } from './leaderboard'

export type { LeaderboardRow }

export async function getViewer(user: AuthUser): Promise<Viewer> {
  const [row] = await db
    .select({ teamId: users.teamId })
    .from(users)
    .where(eq(users.id, user.id))
    .limit(1)
  return { id: user.id, role: user.role, teamId: row?.teamId ?? null }
}

export interface MetricFigure {
  key: string
  value: number
  comparison: Comparison
  /** Part of the value that came from backfilled history. */
  backfilled: number
  /** Part of the value with no credited employee (tenant totals only). */
  unattributed: number
}

export interface PeriodContext {
  period: Period
  range: { start: string; end: string }
  comparison: { start: string; end: string }
  coverage: { liveFrom: string; backfilledAt: string | null }
  /** The selected period reaches back before complete tracking began. */
  includesHistory: boolean
}

function serialiseRange(r: Range) {
  return { start: r.start.toISOString(), end: r.end.toISOString() }
}

async function context(ex: Executor, tenantId: string, period: Period, now: Date) {
  const range = periodRange(period, now)
  const previous = comparisonRange(period, now)
  const coverage = await getCoverage(ex, tenantId)
  const ctx: PeriodContext = {
    period,
    range: serialiseRange(range),
    comparison: serialiseRange(previous),
    coverage: {
      liveFrom: coverage.liveFrom.toISOString(),
      backfilledAt: coverage.backfilledAt?.toISOString() ?? null,
    },
    includesHistory: includesHistory(range, coverage),
  }
  return { range, previous, coverage, ctx }
}

function figures(
  defs: readonly MetricDefinition[],
  current: TotalsRow[],
  previous: DeltaRow[],
  previousRange: Range,
  coverage: Coverage
): MetricFigure[] {
  return defs.map((def) => {
    const value = metricValue(def, current)
    let backfilled = 0
    let unattributed = 0
    for (const row of current) {
      if (!matches(def, row)) continue
      backfilled += row.backfilled
      unattributed += row.unattributed
    }
    return {
      key: def.key,
      value,
      comparison: compare(value, metricValue(def, previous), previousRange, coverage),
      backfilled,
      unattributed,
    }
  })
}

export interface PersonalBoard {
  context: PeriodContext
  figures: MetricFigure[]
  trend: TrendRow[]
  bucket: 'hour' | 'day' | 'month'
  person: { id: string; fullName: string; teamName: string | null }
}

export async function buildPersonalBoard(
  viewer: Viewer,
  tenantId: string,
  period: Period,
  now = new Date(),
  ex: Executor = db
): Promise<PersonalBoard> {
  const { range, previous, coverage, ctx } = await context(ex, tenantId, period, now)
  const scope: CreditScope = { kind: 'user', userId: viewer.id }
  const bucket = trendBucket(period)
  const [current, before, trend, people] = await Promise.all([
    getTotals(ex, tenantId, range, scope),
    getTotals(ex, tenantId, previous, scope),
    getTrend(ex, tenantId, range, bucket, scope),
    getPeople(ex, tenantId),
  ])
  const me = people.find((p) => p.id === viewer.id)
  return {
    context: ctx,
    figures: figures(ACTIVE_METRICS, current, before, previous, coverage),
    trend,
    bucket,
    person: { id: viewer.id, fullName: me?.fullName ?? 'You', teamName: me?.teamName ?? null },
  }
}

export interface TeamMemberRow {
  userId: string
  fullName: string
  isActive: boolean
  /** Still in this team today. False for people who earned credit here then moved. */
  currentMember: boolean
  values: Record<string, number>
  canDrillDown: boolean
}

export interface TeamComparisonRow {
  teamId: string | null
  name: string
  values: Record<string, number>
}

export interface TeamBoard {
  context: PeriodContext
  teams: Team[]
  team: Team | null
  figures: MetricFigure[]
  members: TeamMemberRow[]
  comparison: TeamComparisonRow[]
  trend: TrendRow[]
  bucket: 'hour' | 'day' | 'month'
  canDrillDownTeam: boolean
}

function sumBy(rows: DeltaRow[], def: MetricDefinition) {
  return metricValue(def, rows)
}

export async function buildTeamBoard(
  viewer: Viewer,
  tenantId: string,
  period: Period,
  requestedTeamId: string | null,
  now = new Date(),
  ex: Executor = db
): Promise<TeamBoard> {
  const { range, previous, coverage, ctx } = await context(ex, tenantId, period, now)
  const [teams, people, breakdown] = await Promise.all([
    getTeams(ex, tenantId),
    getPeople(ex, tenantId),
    getCreditBreakdown(ex, tenantId, range),
  ])

  const team =
    teams.find((t) => t.id === requestedTeamId) ??
    teams.find((t) => t.id === viewer.teamId) ??
    teams.find((t) => t.isActive) ??
    null
  const bucket = trendBucket(period)

  // Team comparison: every team with credit in the period, plus credit that
  // counted for no team and credit with no employee — so the rows add up to
  // the tenant total.
  const comparison: TeamComparisonRow[] = []
  const teamIds = new Set<string | null>(breakdown.map((r) => r.teamId))
  for (const t of teams) if (t.isActive) teamIds.add(t.id)
  for (const teamId of teamIds) {
    const rows = breakdown.filter(
      (r) => r.teamId === teamId && (teamId !== null || r.userId !== null)
    )
    const name = teamId ? (teams.find((t) => t.id === teamId)?.name ?? 'Unknown team') : 'No team'
    const values = Object.fromEntries(ACTIVE_METRICS.map((m) => [m.key, sumBy(rows, m)]))
    if (teamId === null && Object.values(values).every((v) => v === 0)) continue
    comparison.push({ teamId, name, values })
  }
  // Only when a visible metric has unattributed credit — events behind hidden
  // metrics (e.g. welcome calls) mustn't produce an all-zero row.
  const unattributedRows = breakdown.filter((r) => r.userId === null)
  const unattributed = Object.fromEntries(
    ACTIVE_METRICS.map((m) => [m.key, sumBy(unattributedRows, m)])
  )
  if (Object.values(unattributed).some((v) => v !== 0)) {
    comparison.push({ teamId: null, name: 'Unattributed', values: unattributed })
  }
  comparison.sort((a, b) => {
    const rank = (r: TeamComparisonRow) =>
      r.name === 'Unattributed' ? 2 : r.teamId === null ? 1 : 0
    return rank(a) - rank(b) || a.name.localeCompare(b.name)
  })

  if (!team) {
    return {
      context: ctx,
      teams,
      team: null,
      figures: [],
      members: [],
      comparison,
      trend: [],
      bucket,
      canDrillDownTeam: false,
    }
  }

  const scope: CreditScope = { kind: 'team', teamId: team.id }
  const [current, before, trend] = await Promise.all([
    getTotals(ex, tenantId, range, scope),
    getTotals(ex, tenantId, previous, scope),
    getTrend(ex, tenantId, range, bucket, scope),
  ])

  // Contributions: anyone whose credit counted for this team in the period,
  // plus current members with nothing yet.
  const memberIds = new Set<string>()
  for (const r of breakdown) if (r.teamId === team.id && r.userId) memberIds.add(r.userId)
  for (const p of people) if (p.teamId === team.id && p.isActive) memberIds.add(p.id)

  const members: TeamMemberRow[] = [...memberIds]
    .map((id) => {
      const person = people.find((p) => p.id === id)
      const rows = breakdown.filter((r) => r.teamId === team.id && r.userId === id)
      return {
        userId: id,
        fullName: person?.fullName ?? 'Unknown employee',
        isActive: person?.isActive ?? false,
        currentMember: person?.teamId === team.id,
        values: Object.fromEntries(ACTIVE_METRICS.map((m) => [m.key, sumBy(rows, m)])),
        canDrillDown: canViewUserEvents(viewer, { id, teamId: person?.teamId ?? null }),
      }
    })
    .sort((a, b) => a.fullName.localeCompare(b.fullName))

  return {
    context: ctx,
    teams,
    team,
    figures: figures(ACTIVE_METRICS, current, before, previous, coverage),
    members,
    comparison,
    trend,
    bucket,
    canDrillDownTeam: canViewTeamEvents(viewer, team.id),
  }
}

export interface LeaderboardBoard {
  context: PeriodContext
  metricKey: string
  rows: LeaderboardRow[]
}

/**
 * Ranks employees by one metric. Ties share a rank (1, 2, 2, 4). Unattributed
 * credit is shown below the ranking, never ranked.
 */
export async function buildLeaderboard(
  viewer: Viewer,
  tenantId: string,
  period: Period,
  metric: MetricDefinition,
  now = new Date(),
  ex: Executor = db
): Promise<LeaderboardBoard> {
  const { range, ctx } = await context(ex, tenantId, period, now)
  const [people, breakdown] = await Promise.all([
    getPeople(ex, tenantId),
    getCreditBreakdown(ex, tenantId, range),
  ])
  return {
    context: ctx,
    metricKey: metric.key,
    rows: rankLeaderboard(viewer, people, breakdown, metric),
  }
}

export function visibleMetrics() {
  return {
    active: ACTIVE_METRICS,
    pending: METRICS.filter((m) => m.status !== 'active'),
  }
}

export { hasFullVisibility }
