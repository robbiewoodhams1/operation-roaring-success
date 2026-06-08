'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChevronLeft, ChevronRight, Users, User } from 'lucide-react'
import { cn } from '@/lib/utils'

type ServiceStat = {
  total: number
  attempted: number
  live: number
  pct: number
}

type ServiceStats = {
  bb: ServiceStat
  whc: ServiceStat
  nfon: ServiceStat
  mpf: ServiceStat
}

type StatsBlock = {
  totalDeals: number
  serviceStats: ServiceStats
}

type ViewMode = 'team' | 'individual'

const serviceColours: Record<string, { bar: string; badge: string }> = {
  bb: { bar: 'bg-blue-500', badge: 'bg-blue-100 text-blue-800' },
  whc: { bar: 'bg-purple-500', badge: 'bg-purple-100 text-purple-800' },
  nfon: { bar: 'bg-indigo-500', badge: 'bg-indigo-100 text-indigo-800' },
  mpf: { bar: 'bg-orange-500', badge: 'bg-orange-100 text-orange-800' },
}

function ProgressBar({ pct, colour }: { pct: number; colour: string }) {
  return (
    <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
      <div
        className={cn('h-2 rounded-full transition-all duration-500', colour)}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

function ServiceCard({ type, stat }: { type: string; stat: ServiceStat }) {
  const colours = serviceColours[type]
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <span className={cn('px-2 py-0.5 rounded text-xs font-bold', colours.badge)}>
            {type.toUpperCase()}
          </span>
          <span className="text-muted-foreground font-normal">provisioning</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Attempted</span>
            <span className="font-semibold">{stat.pct}%</span>
          </div>
          <ProgressBar pct={stat.pct} colour={colours.bar} />
          <p className="text-xs text-muted-foreground">
            {stat.attempted} of {stat.total} services attempted
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2 pt-1 border-t">
          <div className="text-center">
            <p className="text-lg font-bold">{stat.total}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold">{stat.attempted}</p>
            <p className="text-xs text-muted-foreground">Attempted</p>
          </div>
          <div className="text-center">
            <p className={cn('text-lg font-bold', stat.live > 0 && 'text-green-600')}>
              {stat.live}
            </p>
            <p className="text-xs text-muted-foreground">Live</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function StatsView({ stats }: { stats: StatsBlock }) {
  const { totalDeals, serviceStats } = stats
  const overallAttempted = Object.values(serviceStats).reduce((s, v) => s + v.attempted, 0)
  const overallTotal = Object.values(serviceStats).reduce((s, v) => s + v.total, 0)
  const overallPct = overallTotal > 0 ? Math.round((overallAttempted / overallTotal) * 100) : 0
  const overallLive = Object.values(serviceStats).reduce((s, v) => s + v.live, 0)

  return (
    <div className="space-y-4">
      <Card className="border-2">
        <CardContent className="pt-6">
          <div className="grid grid-cols-4 gap-6">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Deals this month
              </p>
              <p className="text-3xl font-bold mt-1">{totalDeals}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Services total
              </p>
              <p className="text-3xl font-bold mt-1">{overallTotal}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Attempted
              </p>
              <p className="text-3xl font-bold mt-1">{overallAttempted}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Live
              </p>
              <p className={cn('text-3xl font-bold mt-1', overallLive > 0 && 'text-green-600')}>
                {overallLive}
              </p>
            </div>
          </div>
          <div className="mt-4 space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Overall attempt rate</span>
              <span className="font-semibold">{overallPct}%</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
              <div
                className="h-2.5 rounded-full bg-primary transition-all duration-500"
                style={{ width: `${overallPct}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-4">
        <ServiceCard type="bb" stat={serviceStats.bb} />
        <ServiceCard type="whc" stat={serviceStats.whc} />
        <ServiceCard type="nfon" stat={serviceStats.nfon} />
        <ServiceCard type="mpf" stat={serviceStats.mpf} />
      </div>

      {totalDeals === 0 && (
        <p className="text-center text-sm text-muted-foreground py-8">
          No deals found for this period.
        </p>
      )}
    </div>
  )
}

export function TargetsClient({
  month,
  currentMonth,
  currentYear,
  isCurrentMonth,
  teamStats,
  individualStats,
  userFullName,
}: {
  month: string
  currentMonth: number
  currentYear: number
  isCurrentMonth: boolean
  teamStats: StatsBlock
  individualStats: StatsBlock
  userFullName: string
}) {
  const router = useRouter()
  const [view, setView] = useState<ViewMode>('team')

  function navigate(direction: 'prev' | 'next') {
    let m = Number(currentMonth) + (direction === 'next' ? 1 : -1)
    let y = Number(currentYear)
    if (m > 11) {
      m = 0
      y++
    }
    if (m < 0) {
      m = 11
      y--
    }
    router.push(`/targets/provisioning?month=${m}&year=${y}`)
  }

  const activeStats = view === 'team' ? teamStats : individualStats

  return (
    <div className="p-6 max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">Provisioning Targets</h1>
          {view === 'individual' && <p className="text-sm text-muted-foreground">{userFullName}</p>}
        </div>
        <div className="flex items-center gap-3">
          {/* Team / Individual toggle */}
          <div className="flex items-center gap-1 border rounded-lg p-1">
            <Button
              variant={view === 'team' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setView('team')}
              className="gap-2 h-7"
            >
              <Users className="size-3.5" />
              Team
            </Button>
            <Button
              variant={view === 'individual' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setView('individual')}
              className="gap-2 h-7"
            >
              <User className="size-3.5" />
              Individual
            </Button>
          </div>
          {/* Month nav */}
          <Button variant="outline" size="sm" onClick={() => navigate('prev')}>
            <ChevronLeft className="size-4" />
          </Button>
          <span className="text-sm font-medium w-36 text-center">{month}</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('next')}
            disabled={isCurrentMonth}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      <StatsView stats={activeStats} />
    </div>
  )
}
