'use client'

import { useMemo, useState } from 'react'
import { ACTIVE_METRICS, getMetric, metricValue } from '@/lib/stats/metrics'
import { formatBucket, formatCount } from '@/lib/stats/format'
import { londonWallClock } from '@/lib/stats/periods'
import type { TrendRow } from '@/lib/stats/queries'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const pad = (n: number) => String(n).padStart(2, '0')

/** Every bucket from the start of the period to now, so empty hours/days show as zero. */
function bucketKeys(bucket: 'hour' | 'day' | 'month', start: string, end: string) {
  const s = londonWallClock(new Date(start))
  const e = londonWallClock(new Date(end))
  const keys: string[] = []
  if (bucket === 'hour') {
    for (let h = 0; h <= e.hour; h++)
      keys.push(`${e.year}-${pad(e.month)}-${pad(e.day)}T${pad(h)}:00:00`)
  } else if (bucket === 'month') {
    for (let m = 1; m <= e.month; m++) keys.push(`${e.year}-${pad(m)}-01T00:00:00`)
  } else {
    const d = new Date(Date.UTC(s.year, s.month - 1, s.day))
    const last = Date.UTC(e.year, e.month - 1, e.day)
    while (d.getTime() <= last) {
      keys.push(`${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T00:00:00`)
      d.setUTCDate(d.getUTCDate() + 1)
    }
  }
  return keys
}

const HEIGHT = 140
const BAR_MAX = 24

/**
 * One metric over the selected period: a single-series column chart (one hue,
 * no legend — the title names the series), with a hover/focus tooltip on each
 * column and a table view for screen readers and anyone who prefers numbers.
 */
export function TrendChart({
  trend,
  bucket,
  range,
  defaultMetric = 'deals_opened',
}: {
  trend: TrendRow[]
  bucket: 'hour' | 'day' | 'month'
  range: { start: string; end: string }
  defaultMetric?: string
}) {
  const [metricKey, setMetricKey] = useState(defaultMetric)
  const [hover, setHover] = useState<number | null>(null)
  const [asTable, setAsTable] = useState(false)
  const metric = getMetric(metricKey) ?? ACTIVE_METRICS[0]!

  const points = useMemo(() => {
    const keys = bucketKeys(bucket, range.start, range.end)
    return keys.map((key) => ({
      key,
      value: metricValue(
        metric,
        trend.filter((t) => t.bucket === key)
      ),
    }))
  }, [trend, bucket, range, metric])

  const max = Math.max(1, ...points.map((p) => p.value))
  const total = points.reduce((s, p) => s + p.value, 0)
  const ticks =
    max <= 4 ? Array.from({ length: max + 1 }, (_, i) => i) : [0, Math.round(max / 2), max]
  const items = ACTIVE_METRICS.map((m) => ({ value: m.key, label: m.label }))
  // Label every bucket when they fit, otherwise every few.
  const labelEvery = points.length <= 12 ? 1 : Math.ceil(points.length / 8)

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-medium">{metric.label} over time</h3>
          <p className="text-xs text-muted-foreground">
            {formatCount(total)} in this period, by {bucket}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={metricKey}
            items={items}
            onValueChange={(v) => v && setMetricKey(v as string)}
          >
            <SelectTrigger className="h-8 w-48" aria-label="Statistic to chart">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {items.map((i) => (
                <SelectItem key={i.value} value={i.value}>
                  {i.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <button
            type="button"
            className="text-xs text-muted-foreground hover:text-foreground"
            onClick={() => setAsTable((v) => !v)}
            aria-pressed={asTable}
          >
            {asTable ? 'Chart' : 'Table'}
          </button>
        </div>
      </div>

      {total === 0 && !asTable ? (
        <p className="py-10 text-center text-sm text-muted-foreground border rounded-lg">
          No {metric.label.toLowerCase()} in this period yet.
        </p>
      ) : asTable ? (
        <div className="max-h-64 overflow-auto border rounded-lg">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs text-muted-foreground">
              <tr>
                <th className="text-left font-medium px-3 py-2 capitalize">{bucket}</th>
                <th className="text-right font-medium px-3 py-2">{metric.label}</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {points.map((p) => (
                <tr key={p.key}>
                  <td className="px-3 py-1.5">{formatBucket(p.key, bucket)}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{formatCount(p.value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="relative">
          <div className="flex">
            {/* y-axis */}
            <div
              className="relative w-8 shrink-0 text-[10px] text-muted-foreground"
              style={{ height: HEIGHT }}
            >
              {ticks.map((t) => (
                <span
                  key={t}
                  className="absolute right-1 -translate-y-1/2 tabular-nums"
                  style={{ top: HEIGHT - (t / max) * HEIGHT }}
                >
                  {t}
                </span>
              ))}
            </div>
            <div className="relative flex-1 min-w-0">
              {ticks.map((t) => (
                <div
                  key={t}
                  className="absolute inset-x-0 border-t border-border"
                  style={{ top: HEIGHT - (t / max) * HEIGHT }}
                  aria-hidden
                />
              ))}
              <div
                className="relative flex items-end"
                style={{ height: HEIGHT }}
                role="img"
                aria-label={`${metric.label} by ${bucket}: ${formatCount(total)} in total`}
                onMouseLeave={() => setHover(null)}
              >
                {points.map((p, i) => (
                  <div
                    key={p.key}
                    className="relative flex-1 h-full flex items-end justify-center"
                    onMouseEnter={() => setHover(i)}
                    onFocus={() => setHover(i)}
                    onBlur={() => setHover(null)}
                    tabIndex={0}
                    aria-label={`${formatBucket(p.key, bucket)}: ${formatCount(p.value)}`}
                  >
                    {p.value > 0 && (
                      <div
                        className={`bg-stats-series rounded-t-[4px] transition-opacity ${
                          hover !== null && hover !== i ? 'opacity-60' : ''
                        }`}
                        style={{
                          height: (p.value / max) * HEIGHT,
                          width: `min(${BAR_MAX}px, calc(100% - 2px))`,
                        }}
                      />
                    )}
                  </div>
                ))}
              </div>
              {hover !== null && points[hover] && (
                <div
                  className="pointer-events-none absolute -top-2 z-10 -translate-x-1/2 -translate-y-full rounded-md bg-foreground px-2 py-1 text-xs text-background whitespace-nowrap"
                  style={{ left: `${((hover + 0.5) / points.length) * 100}%` }}
                >
                  {formatBucket(points[hover].key, bucket)} · {formatCount(points[hover].value)}
                </div>
              )}
              <div className="flex mt-1 text-[10px] text-muted-foreground" aria-hidden>
                {points.map((p, i) => (
                  <span key={p.key} className="flex-1 text-center truncate">
                    {i % labelEvery === 0 ? formatBucket(p.key, bucket) : ''}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
