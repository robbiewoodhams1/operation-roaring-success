'use client'

import { useState, useMemo } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { DebtTable } from './debt-table'
import { type DebtRow } from '@/lib/types'
import { DEBT_OUTCOMES, DEBT_OUTCOME_COLOURS, DEBT_OUTCOME_LABELS } from '@/lib/constants'

export function DebtFilters({
  debts,
  userMap,
  provMap,
}: {
  debts: DebtRow[]
  userMap: Record<string, string>
  provMap: Record<string, { accountNumber: string; name: string }>
}) {
  const [search, setSearch] = useState('')
  const [outcomeFilter, setOutcomeFilter] = useState<string[]>([])

  const filtered = useMemo(() => {
    let result = [...debts]
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(
        (d) =>
          d.title.toLowerCase().includes(q) ||
          (d.assignedTo && (userMap[d.assignedTo] ?? '').toLowerCase().includes(q)) ||
          (d.provisioningId &&
            (provMap[d.provisioningId]?.accountNumber ?? '').toLowerCase().includes(q)) ||
          (d.provisioningId && (provMap[d.provisioningId]?.name ?? '').toLowerCase().includes(q))
      )
    }
    if (outcomeFilter.length > 0) {
      result = result.filter((d) => d.outcome && outcomeFilter.includes(d.outcome))
    }
    return result
  }, [debts, search, outcomeFilter, userMap, provMap])

  function toggleOutcome(o: string) {
    setOutcomeFilter((p) => (p.includes(o) ? p.filter((x) => x !== o) : [...p, o]))
  }

  const hasFilters = search || outcomeFilter.length > 0

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search title, account, agent..."
          className="max-w-sm"
        />
        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearch('')
              setOutcomeFilter([])
            }}
          >
            <X className="size-3 mr-1" />
            Clear all
          </Button>
        )}
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Outcome</p>
        <div className="flex flex-wrap gap-2">
          {DEBT_OUTCOMES.map((o) => (
            <button
              key={o}
              onClick={() => toggleOutcome(o)}
              className={cn(
                'px-2.5 py-1 rounded-md text-xs font-medium border transition-all',
                DEBT_OUTCOME_COLOURS[o],
                outcomeFilter.includes(o)
                  ? 'ring-2 ring-offset-1 ring-foreground/30'
                  : 'hover:opacity-80'
              )}
            >
              {DEBT_OUTCOME_LABELS[o] ?? o}
            </button>
          ))}
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        {filtered.length} of {debts.length} records
      </p>
      <DebtTable debts={filtered} userMap={userMap} provMap={provMap} />
    </div>
  )
}
