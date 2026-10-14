'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { getMetric } from '@/lib/stats/metrics'
import { formatCount } from '@/lib/stats/format'
import type { Period } from '@/lib/stats/periods'
import type { TeamComparisonRow, TeamMemberRow } from '@/lib/stats/board'
import { EventsSheet, type DrillTarget } from './events-sheet'

/** Columns shown in the team tables — the headline metrics. */
const COLUMNS = [
  'deals_opened',
  'deals_closed',
  'broadband_applied',
  'broadband_live',
  'voice_applied',
  'voice_live',
] as const

function Cell({
  value,
  onOpen,
  label,
}: {
  value: number
  onOpen?: (() => void) | undefined
  label: string
}) {
  if (!onOpen || value === 0) {
    return <td className="px-3 py-2 text-right tabular-nums">{formatCount(value)}</td>
  }
  return (
    <td className="px-1 py-1 text-right">
      <button
        type="button"
        onClick={onOpen}
        aria-label={label}
        className="w-full px-2 py-1 rounded-md text-right tabular-nums underline-offset-2 hover:underline hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"
      >
        {formatCount(value)}
      </button>
    </td>
  )
}

export function TeamMembersTable({
  members,
  period,
  teamName,
}: {
  members: TeamMemberRow[]
  period: Period
  teamName: string
}) {
  const [target, setTarget] = useState<DrillTarget | null>(null)
  const totals = Object.fromEntries(
    COLUMNS.map((k) => [k, members.reduce((s, m) => s + (m.values[k] ?? 0), 0)])
  )

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <div className="px-4 py-3 border-b">
        <h3 className="text-sm font-medium">Individual contributions</h3>
        <p className="text-xs text-muted-foreground">
          Credit that counted for {teamName} in this period. People who earned credit here and have
          since moved team are included and labelled.
        </p>
      </div>
      {members.length === 0 ? (
        <p className="px-4 py-8 text-sm text-center text-muted-foreground">
          No members yet. An admin can assign people to this team from their user page.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead className="bg-muted/40 text-xs text-muted-foreground">
              <tr>
                <th className="text-left font-medium px-4 py-2">Employee</th>
                {COLUMNS.map((k) => (
                  <th key={k} className="text-right font-medium px-3 py-2">
                    {getMetric(k)!.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {members.map((m) => (
                <tr key={m.userId}>
                  <td className="px-4 py-2">
                    <span className="flex flex-wrap items-center gap-2">
                      {m.fullName}
                      {!m.isActive && (
                        <Badge variant="outline" className="text-muted-foreground">
                          Inactive
                        </Badge>
                      )}
                      {m.isActive && !m.currentMember && (
                        <Badge variant="outline" className="text-muted-foreground">
                          Moved team
                        </Badge>
                      )}
                    </span>
                  </td>
                  {COLUMNS.map((k) => (
                    <Cell
                      key={k}
                      value={m.values[k] ?? 0}
                      label={`${getMetric(k)!.label} for ${m.fullName}: ${m.values[k] ?? 0}`}
                      onOpen={
                        m.canDrillDown
                          ? () =>
                              setTarget({
                                metricKey: k,
                                scope: { kind: 'user', userId: m.userId },
                                subject: m.fullName,
                              })
                          : undefined
                      }
                    />
                  ))}
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t bg-muted/20 font-medium">
              <tr>
                <td className="px-4 py-2">Team total</td>
                {COLUMNS.map((k) => (
                  <td key={k} className="px-3 py-2 text-right tabular-nums">
                    {formatCount(totals[k] ?? 0)}
                  </td>
                ))}
              </tr>
            </tfoot>
          </table>
        </div>
      )}
      <EventsSheet target={target} period={period} onClose={() => setTarget(null)} />
    </div>
  )
}

export function TeamComparisonTable({
  rows,
  selectedTeamId,
}: {
  rows: TeamComparisonRow[]
  selectedTeamId: string | null
}) {
  const totals = Object.fromEntries(
    COLUMNS.map((k) => [k, rows.reduce((s, r) => s + (r.values[k] ?? 0), 0)])
  )
  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <div className="px-4 py-3 border-b">
        <h3 className="text-sm font-medium">Team comparison</h3>
        <p className="text-xs text-muted-foreground">
          Every team, plus credit that counted for no team. The rows add up to the company total.
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[640px]">
          <thead className="bg-muted/40 text-xs text-muted-foreground">
            <tr>
              <th className="text-left font-medium px-4 py-2">Team</th>
              {COLUMNS.map((k) => (
                <th key={k} className="text-right font-medium px-3 py-2">
                  {getMetric(k)!.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((r) => (
              <tr
                key={`${r.teamId}-${r.name}`}
                className={cn(r.teamId && r.teamId === selectedTeamId && 'bg-muted/40')}
              >
                <td
                  className={cn('px-4 py-2', r.teamId === null && 'italic text-muted-foreground')}
                >
                  {r.name}
                </td>
                {COLUMNS.map((k) => (
                  <td key={k} className="px-3 py-2 text-right tabular-nums">
                    {formatCount(r.values[k] ?? 0)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t bg-muted/20 font-medium">
            <tr>
              <td className="px-4 py-2">Company total</td>
              {COLUMNS.map((k) => (
                <td key={k} className="px-3 py-2 text-right tabular-nums">
                  {formatCount(totals[k] ?? 0)}
                </td>
              ))}
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}
