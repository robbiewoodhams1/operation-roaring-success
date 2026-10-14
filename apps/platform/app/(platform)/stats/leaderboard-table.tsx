'use client'

import { useState } from 'react'
import { Trophy, ChevronRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { getMetric } from '@/lib/stats/metrics'
import { formatCount } from '@/lib/stats/format'
import type { Period } from '@/lib/stats/periods'
import type { LeaderboardRow } from '@/lib/stats/board'
import { EventsSheet, type DrillTarget } from './events-sheet'

/** Ranked employees for one metric. Ties share a rank; unattributed credit is never ranked. */
export function LeaderboardTable({
  rows,
  metricKey,
  period,
}: {
  rows: LeaderboardRow[]
  metricKey: string
  period: Period
}) {
  const [target, setTarget] = useState<DrillTarget | null>(null)
  const metric = getMetric(metricKey)!
  const ranked = rows.filter((r) => r.rank !== null)

  function open(row: LeaderboardRow) {
    if (!row.canDrillDown) return
    setTarget({
      metricKey,
      scope: row.userId ? { kind: 'user', userId: row.userId } : { kind: 'unattributed' },
      subject: row.isViewer ? 'You' : row.fullName,
    })
  }

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      {ranked.length === 0 && (
        <p className="px-4 py-8 text-sm text-center text-muted-foreground">
          Nobody has any {metric.label.toLowerCase()} in this period yet.
        </p>
      )}
      <ol className="divide-y" aria-label={`${metric.label} leaderboard`}>
        {rows.map((row) => {
          const clickable = row.canDrillDown && row.value !== 0
          const content = (
            <>
              <span className="w-8 shrink-0 flex justify-center" aria-hidden={row.rank === null}>
                {row.rank === null ? (
                  <span className="text-xs text-muted-foreground">—</span>
                ) : row.rank <= 3 ? (
                  <span className="relative inline-flex items-center justify-center">
                    <Trophy
                      className={cn(
                        'size-4',
                        row.rank === 1 && 'text-yellow-500',
                        row.rank === 2 && 'text-gray-400',
                        row.rank === 3 && 'text-amber-700'
                      )}
                      aria-hidden
                    />
                    <span className="sr-only">Rank {row.rank}</span>
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground tabular-nums">{row.rank}</span>
                )}
              </span>
              <span className="flex-1 min-w-0">
                <span className="flex flex-wrap items-center gap-2">
                  <span className={cn('text-sm truncate', row.userId === null && 'italic')}>
                    {row.fullName}
                  </span>
                  {row.isViewer && <Badge variant="outline">You</Badge>}
                  {!row.isActive && (
                    <Badge variant="outline" className="text-muted-foreground">
                      Inactive
                    </Badge>
                  )}
                </span>
                <span className="block text-xs text-muted-foreground truncate">
                  {row.userId === null
                    ? 'Credit with no linked employee — not ranked'
                    : (row.teamName ?? 'No team')}
                </span>
              </span>
              <span className="text-sm font-semibold tabular-nums">{formatCount(row.value)}</span>
              {clickable && <ChevronRight className="size-4 text-muted-foreground" aria-hidden />}
            </>
          )
          return (
            <li key={row.userId ?? 'unattributed'} className={cn(row.isViewer && 'bg-muted/40')}>
              {clickable ? (
                <button
                  type="button"
                  onClick={() => open(row)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-muted/60 focus-visible:outline-2 focus-visible:outline-ring"
                >
                  {content}
                </button>
              ) : (
                <div className="flex items-center gap-3 px-4 py-2.5">{content}</div>
              )}
            </li>
          )
        })}
      </ol>
      <EventsSheet target={target} period={period} onClose={() => setTarget(null)} />
    </div>
  )
}
