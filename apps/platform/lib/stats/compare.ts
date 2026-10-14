import type { Range } from './periods'

/**
 * Coverage of the event history for a tenant. Events are complete from
 * `liveFrom` (when recording began); anything earlier was backfilled from
 * whatever evidence existed and may be partial.
 */
export interface Coverage {
  liveFrom: Date
  backfilledAt: Date | null
}

export type Comparison =
  /** The comparison period isn't fully covered by complete tracking. */
  | { kind: 'no_baseline'; reason: string }
  | { kind: 'change'; previous: number; delta: number; percent: number | null }

/**
 * Compares a value with the same span of the previous period. A percentage is
 * only given when the baseline is complete and non-zero; growth from zero is
 * reported as an absolute change only.
 */
export function compare(
  current: number,
  previous: number,
  comparisonRange: Range,
  coverage: Coverage
): Comparison {
  if (comparisonRange.start < coverage.liveFrom) {
    return {
      kind: 'no_baseline',
      reason:
        coverage.backfilledAt === null
          ? 'Tracking started after the comparison period began'
          : 'The comparison period relies on partial historical data',
    }
  }
  const delta = current - previous
  return {
    kind: 'change',
    previous,
    delta,
    percent: previous > 0 ? Math.round((delta / previous) * 100) : null,
  }
}

/** Whether a range includes any time before complete tracking began. */
export function includesHistory(range: Range, coverage: Coverage): boolean {
  return range.start < coverage.liveFrom
}
