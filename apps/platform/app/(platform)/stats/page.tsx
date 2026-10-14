import Link from 'next/link'
import { History, Clock } from 'lucide-react'
import { requireUser } from '@roaring/auth/server'
import { db } from '@roaring/db'
import { cn } from '@/lib/utils'
import {
  buildLeaderboard,
  buildPersonalBoard,
  buildTeamBoard,
  getViewer,
  type PeriodContext,
} from '@/lib/stats/board'
import {
  DEFAULT_LEADERBOARD_METRIC,
  LEADERBOARD_METRICS,
  METRICS,
  METRIC_GROUP_LABELS,
  VISIBLE_EVENT_TYPES,
  getMetric,
} from '@/lib/stats/metrics'
import {
  PERIODS,
  PERIOD_LABELS,
  PERIOD_SHORT_LABELS,
  describeRange,
  isPeriod,
  type Period,
} from '@/lib/stats/periods'
import { comparisonLabel, formatDateTime } from '@/lib/stats/format'
import { feedScope } from '@/lib/stats/permissions'
import { getEvents, type EventScope } from '@/lib/stats/queries'
import { MetricGrid } from './metric-grid'
import { TrendChart } from './trend-chart'
import { ActivityFeed } from './activity-feed'
import { LeaderboardTable } from './leaderboard-table'
import { TeamComparisonTable, TeamMembersTable } from './team-tables'
import { NavSelect } from './nav-select'

const VIEWS = [
  { key: 'me', label: 'My performance' },
  { key: 'team', label: 'Team' },
  { key: 'leaderboard', label: 'Leaderboards' },
] as const
type View = (typeof VIEWS)[number]['key']

type Params = { view?: string; period?: string; team?: string; metric?: string }

function href(current: Params, change: Partial<Params>) {
  const next = new URLSearchParams()
  const merged = { ...current, ...change }
  for (const [k, v] of Object.entries(merged)) if (v) next.set(k, v)
  return `/stats?${next.toString()}`
}

function Tabs({
  items,
  active,
  label,
}: {
  items: { key: string; label: string; href: string }[]
  active: string
  label: string
}) {
  return (
    <nav
      aria-label={label}
      className="inline-flex rounded-lg border bg-muted/40 p-0.5 max-w-full overflow-x-auto"
    >
      {items.map((i) => (
        <Link
          key={i.key}
          href={i.href}
          aria-current={i.key === active ? 'page' : undefined}
          className={cn(
            'px-3 py-1.5 text-sm rounded-md whitespace-nowrap transition-colors',
            i.key === active
              ? 'bg-background shadow-sm font-medium'
              : 'text-muted-foreground hover:text-foreground'
          )}
          scroll={false}
        >
          {i.label}
        </Link>
      ))}
    </nav>
  )
}

function CoverageNote({ context }: { context: PeriodContext }) {
  const liveFrom = formatDateTime(context.coverage.liveFrom)
  return (
    <div className="flex flex-col gap-1 text-xs text-muted-foreground sm:flex-row sm:items-center sm:gap-4">
      <span className="inline-flex items-center gap-1">
        <Clock className="size-3" aria-hidden />
        {describeRange({
          start: new Date(context.range.start),
          end: new Date(context.range.end),
        })}{' '}
        · UK time · compared with the {comparisonLabel(context.period)}
      </span>
      {context.includesHistory && (
        <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-400">
          <History className="size-3" aria-hidden />
          Live tracking began {liveFrom}. Earlier activity is rebuilt from history and may be
          incomplete.
        </span>
      )}
    </div>
  )
}

function PendingMetrics() {
  const pending = METRICS.filter((m) => m.status !== 'active')
  return (
    <details className="rounded-xl border bg-card">
      <summary className="px-4 py-3 text-sm font-medium cursor-pointer">
        Statistics not shown yet ({pending.length})
      </summary>
      <ul className="divide-y border-t">
        {pending.map((m) => (
          <li key={m.key} className="px-4 py-3 space-y-0.5">
            <p className="text-sm">
              {m.label}{' '}
              <span className="text-xs text-muted-foreground">
                · {METRIC_GROUP_LABELS[m.group]} ·{' '}
                {m.status === 'unavailable' ? 'Unavailable' : 'Awaiting approval'}
              </span>
            </p>
            <p className="text-xs text-muted-foreground">{m.statusNote}</p>
          </li>
        ))}
      </ul>
    </details>
  )
}

export default async function StatsPage({ searchParams }: { searchParams: Promise<Params> }) {
  const user = await requireUser()
  const params = await searchParams
  const viewer = await getViewer(user)

  const period: Period = isPeriod(params.period) ? params.period : 'today'
  const view: View = VIEWS.some((v) => v.key === params.view) ? (params.view as View) : 'me'
  const current: Params = { ...params, view, period }

  const viewTabs = VIEWS.map((v) => ({
    key: v.key,
    label: v.label,
    href: href(current, { view: v.key }),
  }))
  const periodTabs = PERIODS.map((p) => ({
    key: p,
    label: PERIOD_SHORT_LABELS[p],
    href: href(current, { period: p }),
  }))

  return (
    <div className="p-4 sm:p-6 space-y-6 w-full max-w-7xl">
      <header className="space-y-4">
        <div>
          <h1 className="text-2xl font-semibold">Stats</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Credited activity for {PERIOD_LABELS[period].toLowerCase()}. Hover the{' '}
            <span className="sr-only">information</span>ⓘ on a figure to see exactly what it counts.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Tabs items={viewTabs} active={view} label="Stats view" />
          <Tabs items={periodTabs} active={period} label="Reporting period" />
        </div>
      </header>

      {view === 'me' && <PersonalView viewer={viewer} tenantId={user.tenantId} period={period} />}
      {view === 'team' && (
        <TeamView
          viewer={viewer}
          tenantId={user.tenantId}
          period={period}
          teamId={params.team ?? null}
        />
      )}
      {view === 'leaderboard' && (
        <LeaderboardView
          viewer={viewer}
          tenantId={user.tenantId}
          period={period}
          metricKey={params.metric ?? DEFAULT_LEADERBOARD_METRIC}
        />
      )}

      <PendingMetrics />
    </div>
  )
}

type Viewer = Awaited<ReturnType<typeof getViewer>>

async function PersonalView({
  viewer,
  tenantId,
  period,
}: {
  viewer: Viewer
  tenantId: string
  period: Period
}) {
  const fs = feedScope(viewer)
  const feedEventScope: EventScope =
    fs.kind === 'tenant'
      ? { kind: 'tenant' }
      : fs.kind === 'team'
        ? { kind: 'team', teamId: fs.teamId, userId: fs.userId }
        : { kind: 'involving', userId: fs.userId }

  const [board, feed] = await Promise.all([
    buildPersonalBoard(viewer, tenantId, period),
    getEvents(db, tenantId, { scope: feedEventScope, eventTypes: VISIBLE_EVENT_TYPES, limit: 20 }),
  ])

  const feedLabel =
    fs.kind === 'tenant'
      ? 'Everyone’s credited activity'
      : fs.kind === 'team'
        ? 'Your team’s activity and your own'
        : 'Activity credited to you or recorded by you'

  return (
    <div className="space-y-6">
      <CoverageNote context={board.context} />
      <section aria-labelledby="me-heading" className="space-y-4">
        <h2 id="me-heading" className="sr-only">
          My performance
        </h2>
        <p className="text-sm">
          <span className="font-medium">{board.person.fullName}</span>
          <span className="text-muted-foreground"> · {board.person.teamName ?? 'No team'}</span>
        </p>
        <MetricGrid
          figures={board.figures}
          period={period}
          scope={{ kind: 'user', userId: viewer.id }}
          subject="You"
          canOpen
        />
      </section>
      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3 rounded-xl border bg-card p-4">
          <TrendChart trend={board.trend} bucket={board.bucket} range={board.context.range} />
        </div>
        <div className="lg:col-span-2">
          <ActivityFeed
            userId={viewer.id}
            initial={feed.events}
            initialCursor={feed.nextCursor}
            scopeLabel={feedLabel}
          />
        </div>
      </div>
    </div>
  )
}

async function TeamView({
  viewer,
  tenantId,
  period,
  teamId,
}: {
  viewer: Viewer
  tenantId: string
  period: Period
  teamId: string | null
}) {
  const board = await buildTeamBoard(viewer, tenantId, period, teamId)
  const teamOptions = board.teams
    .filter((t) => t.isActive || t.id === board.team?.id)
    .map((t) => ({ value: t.id, label: t.isActive ? t.name : `${t.name} (retired)` }))

  return (
    <div className="space-y-6">
      <CoverageNote context={board.context} />
      {board.team ? (
        <>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-lg font-medium">{board.team.name}</h2>
            <NavSelect param="team" value={board.team.id} options={teamOptions} label="Team" />
          </div>
          <MetricGrid
            figures={board.figures}
            period={period}
            scope={{ kind: 'team', teamId: board.team.id }}
            subject={board.team.name}
            canOpen={board.canDrillDownTeam}
          />
          <TeamMembersTable members={board.members} period={period} teamName={board.team.name} />
          <div className="rounded-xl border bg-card p-4">
            <TrendChart trend={board.trend} bucket={board.bucket} range={board.context.range} />
          </div>
        </>
      ) : (
        <div className="rounded-xl border bg-card px-4 py-10 text-center space-y-1">
          <p className="text-sm font-medium">No teams set up yet</p>
          <p className="text-sm text-muted-foreground">
            An admin can create teams under Admin → Teams and assign people from their user page.
          </p>
        </div>
      )}
      <TeamComparisonTable rows={board.comparison} selectedTeamId={board.team?.id ?? null} />
    </div>
  )
}

async function LeaderboardView({
  viewer,
  tenantId,
  period,
  metricKey,
}: {
  viewer: Viewer
  tenantId: string
  period: Period
  metricKey: string
}) {
  const metric =
    LEADERBOARD_METRICS.find((m) => m.key === metricKey) ?? getMetric(DEFAULT_LEADERBOARD_METRIC)!
  const board = await buildLeaderboard(viewer, tenantId, period, metric)
  const options = LEADERBOARD_METRICS.map((m) => ({ value: m.key, label: m.label }))

  return (
    <div className="space-y-4">
      <CoverageNote context={board.context} />
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-medium">{metric.label}</h2>
          <p className="text-xs text-muted-foreground max-w-xl">
            {metric.definition} Credit: {metric.creditedTo}. Ranked by count only — there is no
            combined score.
          </p>
        </div>
        <NavSelect param="metric" value={metric.key} options={options} label="Rank by" />
      </div>
      <LeaderboardTable rows={board.rows} metricKey={metric.key} period={period} />
    </div>
  )
}
