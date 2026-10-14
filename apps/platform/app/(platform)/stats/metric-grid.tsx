'use client'

import { useState } from 'react'
import { ArrowDownRight, ArrowUpRight, Minus, Info, ChevronRight } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { getMetric, METRIC_GROUP_LABELS, type MetricGroup } from '@/lib/stats/metrics'
import { describeComparison, formatCount, comparisonLabel } from '@/lib/stats/format'
import type { Period } from '@/lib/stats/periods'
import type { MetricFigure } from '@/lib/stats/board'
import type { DrillScope } from './actions'
import { EventsSheet, type DrillTarget } from './events-sheet'

const GROUP_ORDER: MetricGroup[] = ['sales', 'provisioning', 'provisioning_detail']

function Change({ figure, period }: { figure: MetricFigure; period: Period }) {
  const { text, direction } = describeComparison(figure.comparison)
  const Icon = direction === 'up' ? ArrowUpRight : direction === 'down' ? ArrowDownRight : Minus
  return (
    <p className="text-xs text-muted-foreground flex items-center gap-1 min-h-4">
      {direction !== 'none' && <Icon className="size-3 shrink-0" aria-hidden />}
      <span>
        {text}
        {direction !== 'none' && <span className="sr-only"> at the {comparisonLabel(period)}</span>}
      </span>
    </p>
  )
}

function FigureCard({
  figure,
  period,
  onOpen,
  canOpen,
}: {
  figure: MetricFigure
  period: Period
  onOpen: () => void
  canOpen: boolean
}) {
  const def = getMetric(figure.key)!
  const notes: string[] = []
  if (figure.backfilled !== 0) notes.push(`${formatCount(figure.backfilled)} rebuilt from history`)
  if (figure.unattributed !== 0) notes.push(`${formatCount(figure.unattributed)} unattributed`)

  const body = (
    <>
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm text-muted-foreground">{def.label}</span>
        <Tooltip>
          <TooltipTrigger
            render={<span />}
            className="text-muted-foreground hover:text-foreground"
            aria-label={`How ${def.label} is counted`}
            onClick={(e) => e.stopPropagation()}
          >
            <Info className="size-3.5" aria-hidden />
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            {def.definition} Credit: {def.creditedTo}.
          </TooltipContent>
        </Tooltip>
      </div>
      <div className="text-3xl font-semibold tabular-nums">{formatCount(figure.value)}</div>
      <Change figure={figure} period={period} />
      {notes.length > 0 && (
        <p className="text-xs text-amber-700 dark:text-amber-400">{notes.join(' · ')}</p>
      )}
    </>
  )

  return canOpen ? (
    <button
      type="button"
      onClick={onOpen}
      className="group text-left rounded-xl border bg-card p-4 space-y-1 transition-colors hover:border-foreground/30 focus-visible:outline-2 focus-visible:outline-ring"
    >
      {body}
      <span className="flex items-center gap-0.5 text-xs text-muted-foreground opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100">
        View activity <ChevronRight className="size-3" aria-hidden />
      </span>
    </button>
  ) : (
    <div className="rounded-xl border bg-card p-4 space-y-1">{body}</div>
  )
}

/** Figures for one subject (a person or a team), grouped, each opening its events. */
export function MetricGrid({
  figures,
  period,
  scope,
  subject,
  canOpen,
}: {
  figures: MetricFigure[]
  period: Period
  scope: DrillScope
  subject: string
  canOpen: boolean
}) {
  const [target, setTarget] = useState<DrillTarget | null>(null)
  const [showDetail, setShowDetail] = useState(false)

  return (
    <div className="space-y-6">
      {GROUP_ORDER.map((group) => {
        const items = figures.filter((f) => getMetric(f.key)?.group === group)
        // Per-type cards read as two rows: every "applied", then every "live".
        if (group === 'provisioning_detail')
          items.sort((a, b) => Number(a.key.endsWith('_live')) - Number(b.key.endsWith('_live')))
        if (items.length === 0) return null
        const collapsible = group === 'provisioning_detail'
        return (
          <section key={group} aria-labelledby={`group-${group}`} className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 id={`group-${group}`} className="text-sm font-medium">
                {METRIC_GROUP_LABELS[group]}
              </h3>
              {collapsible && (
                <button
                  type="button"
                  className="text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => setShowDetail((v) => !v)}
                  aria-expanded={showDetail}
                >
                  {showDetail ? 'Hide' : 'Show'} each service type
                </button>
              )}
            </div>
            {(!collapsible || showDetail) && (
              <div
                className={cn(
                  'grid gap-3 grid-cols-2',
                  collapsible ? 'lg:grid-cols-5' : 'lg:grid-cols-4'
                )}
              >
                {items.map((f) => (
                  <FigureCard
                    key={f.key}
                    figure={f}
                    period={period}
                    canOpen={canOpen}
                    onOpen={() => setTarget({ metricKey: f.key, scope, subject })}
                  />
                ))}
              </div>
            )}
          </section>
        )
      })}
      <EventsSheet target={target} period={period} onClose={() => setTarget(null)} />
    </div>
  )
}
