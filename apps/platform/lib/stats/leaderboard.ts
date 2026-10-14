/** Leaderboard ranking — pure, so it can be tested without a database. */
import { metricValue, type MetricDefinition } from './metrics'
import { canViewUnattributedEvents, canViewUserEvents, type Viewer } from './permissions'
import type { Person } from './queries'

export interface LeaderboardRow {
  rank: number | null
  userId: string | null
  fullName: string
  teamName: string | null
  isActive: boolean
  isViewer: boolean
  value: number
  canDrillDown: boolean
}

/**
 * Ranks employees by one metric. Ties share a rank (1, 2, 2, 4). Unattributed
 * credit is shown below the ranking, never ranked.
 */
export function rankLeaderboard(
  viewer: Viewer,
  people: Person[],
  breakdown: {
    userId: string | null
    eventType: string
    serviceType: string | null
    total: number
  }[],
  metric: MetricDefinition
): LeaderboardRow[] {
  const totals = new Map<string | null, number>()
  for (const r of breakdown) {
    const v = metricValue(metric, [r])
    if (v !== 0) totals.set(r.userId, (totals.get(r.userId) ?? 0) + v)
  }

  const ranked = [...totals.entries()]
    .filter(([id, v]) => id !== null && v > 0)
    .map(([id, value]) => {
      const person = people.find((p) => p.id === id)
      return {
        userId: id,
        fullName: person?.fullName ?? 'Unknown employee',
        teamName: person?.teamName ?? null,
        isActive: person?.isActive ?? false,
        isViewer: id === viewer.id,
        value,
        canDrillDown: canViewUserEvents(viewer, { id: id!, teamId: person?.teamId ?? null }),
      }
    })
    .sort((a, b) => b.value - a.value || a.fullName.localeCompare(b.fullName))

  const rows: LeaderboardRow[] = []
  let previousValue: number | null = null
  let rank = 0
  ranked.forEach((r, i) => {
    if (r.value !== previousValue) rank = i + 1
    previousValue = r.value
    rows.push({ ...r, rank })
  })

  // Always show the viewer, even with nothing yet this period.
  if (!rows.some((r) => r.isViewer)) {
    const me = people.find((p) => p.id === viewer.id)
    rows.push({
      rank: null,
      userId: viewer.id,
      fullName: me?.fullName ?? 'You',
      teamName: me?.teamName ?? null,
      isActive: true,
      isViewer: true,
      value: 0,
      canDrillDown: true,
    })
  }

  const unattributed = totals.get(null) ?? 0
  if (unattributed !== 0) {
    rows.push({
      rank: null,
      userId: null,
      fullName: 'Unattributed',
      teamName: null,
      isActive: true,
      isViewer: false,
      value: unattributed,
      canDrillDown: canViewUnattributedEvents(viewer),
    })
  }
  return rows
}
