'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, User, ChevronLeft, ChevronRight, Trophy } from 'lucide-react'
import { cn } from '@/lib/utils'
import { type ViewMode } from '@/lib/types'

type TypeFilter = 'all' | 'business' | 'residential'

type DealRow = {
  salesAgent: string
  closingAgent: string
  dealType: string
  monthlyGp: number
}

type LeaderboardEntry = {
  agent: string
  count: number
  gp: number
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

function formatGp(gp: number): string {
  return `£${gp.toFixed(2)}`
}

function medalColour(rank: number): string {
  if (rank === 0) return 'text-yellow-500'
  if (rank === 1) return 'text-gray-400'
  if (rank === 2) return 'text-amber-700'
  return 'text-muted-foreground'
}

function buildLeaderboard(rows: DealRow[], key: 'salesAgent' | 'closingAgent'): LeaderboardEntry[] {
  const map = new Map<string, { count: number; gp: number }>()
  for (const row of rows) {
    const agent = row[key]
    if (!agent) continue
    const existing = map.get(agent) ?? { count: 0, gp: 0 }
    map.set(agent, { count: existing.count + 1, gp: existing.gp + row.monthlyGp })
  }
  return [...map.entries()]
    .map(([agent, stats]) => ({ agent, ...stats }))
    .sort((a, b) => b.count - a.count)
}

function Leaderboard({ title, entries }: { title: string; entries: LeaderboardEntry[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        {entries.length === 0 && (
          <p className="text-sm text-muted-foreground py-4 text-center">No deals this period.</p>
        )}
        {entries.map((entry, i) => (
          <div
            key={entry.agent}
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-lg',
              i === 0 && 'bg-yellow-50'
            )}
          >
            <div className="size-6 flex items-center justify-center shrink-0">
              {i < 3 ? (
                <Trophy className={cn('size-4', medalColour(i))} />
              ) : (
                <span className="text-xs text-muted-foreground font-medium">{i + 1}</span>
              )}
            </div>
            <span className="text-sm font-medium flex-1 truncate">{entry.agent}</span>
            <span className="text-sm text-muted-foreground">
              {entry.count} deal{entry.count !== 1 ? 's' : ''}
            </span>
            <span className="text-sm font-mono text-green-700 w-20 text-right">
              {formatGp(entry.gp)}
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

export function SalesTargetsClient({
  deals,
  fullName,
  month,
  year,
}: {
  deals: DealRow[]
  fullName: string
  month: number
  year: number
}) {
  const router = useRouter()
  const [view, setView] = useState<ViewMode>('team')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')

  const filtered = useMemo(() => {
    if (typeFilter === 'all') return deals
    return deals.filter((d) => d.dealType === typeFilter)
  }, [deals, typeFilter])

  const salesLeaderboard = useMemo(() => buildLeaderboard(filtered, 'salesAgent'), [filtered])
  const closingLeaderboard = useMemo(() => buildLeaderboard(filtered, 'closingAgent'), [filtered])

  const mySales = salesLeaderboard.find((e) => e.agent === fullName) ?? {
    agent: fullName,
    count: 0,
    gp: 0,
  }
  const myClosing = closingLeaderboard.find((e) => e.agent === fullName) ?? {
    agent: fullName,
    count: 0,
    gp: 0,
  }

  function navigateMonth(delta: number) {
    let newMonth = month + delta
    let newYear = year
    if (newMonth < 0) {
      newMonth = 11
      newYear--
    }
    if (newMonth > 11) {
      newMonth = 0
      newYear++
    }
    router.push(`/targets/sales?month=${newMonth}&year=${newYear}`)
  }

  return (
    <div className="p-6 w-full space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Sales Targets</h1>
        <div className="flex items-center gap-1 border rounded-lg p-1">
          <Button
            variant={view === 'team' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setView('team')}
            className="gap-2"
          >
            <Users className="size-3.5" />
            Team
          </Button>
          <Button
            variant={view === 'individual' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setView('individual')}
            className="gap-2"
          >
            <User className="size-3.5" />
            Individual
          </Button>
        </div>
      </div>

      {/* Month navigation */}
      <div className="flex items-center justify-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigateMonth(-1)}>
          <ChevronLeft className="size-4" />
        </Button>
        <span className="text-sm font-medium w-40 text-center">
          {MONTH_NAMES[month]} {year}
        </span>
        <Button variant="ghost" size="sm" onClick={() => navigateMonth(1)}>
          <ChevronRight className="size-4" />
        </Button>
      </div>

      {/* Type filter */}
      <div className="flex justify-center gap-2">
        {(['all', 'business', 'residential'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTypeFilter(t)}
            className={cn(
              'px-3 py-1 rounded-md text-xs font-medium border transition-all',
              typeFilter === t
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-muted text-muted-foreground border-border hover:bg-muted/80'
            )}
          >
            {t === 'all' ? 'All' : t === 'business' ? 'Business' : 'Residential'}
          </button>
        ))}
      </div>

      {view === 'team' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Leaderboard title="Sales agent — deals sold" entries={salesLeaderboard} />
          <Leaderboard title="Closing agent — deals closed" entries={closingLeaderboard} />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">My sales</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-3xl font-semibold">{mySales.count}</p>
                <p className="text-sm text-muted-foreground">deals sold</p>
              </div>
              <div>
                <p className="text-xl font-mono text-green-700">{formatGp(mySales.gp)}</p>
                <p className="text-sm text-muted-foreground">total GP</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">My closes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-3xl font-semibold">{myClosing.count}</p>
                <p className="text-sm text-muted-foreground">deals closed</p>
              </div>
              <div>
                <p className="text-xl font-mono text-green-700">{formatGp(myClosing.gp)}</p>
                <p className="text-sm text-muted-foreground">total GP</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
