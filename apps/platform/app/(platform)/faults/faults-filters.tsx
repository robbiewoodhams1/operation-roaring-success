'use client'

import { useState, useMemo } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { FaultsTable } from './faults-table'
import { Pagination, usePagination } from '@/components/pagination'
import { type FaultRow } from '@/lib/types'
import {
  FAULT_STATUSES,
  FAULT_TYPES,
  FAULT_STATUS_COLOURS,
  FAULT_TYPE_COLOURS,
  FAULT_STATUS_LABELS,
  FAULT_TYPE_LABELS,
} from '@/lib/constants'

export function FaultsFilters({
  faults,
  userMap,
  provMap,
}: {
  faults: FaultRow[]
  userMap: Record<string, string>
  provMap: Record<string, { accountNumber: string; name: string }>
}) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string[]>([])
  const [typeFilter, setTypeFilter] = useState<string[]>([])

  const filtered = useMemo(() => {
    let result = [...faults]

    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(
        (f) =>
          f.title.toLowerCase().includes(q) ||
          (f.ticketRef ?? '').toLowerCase().includes(q) ||
          (f.assignedTo && (userMap[f.assignedTo] ?? '').toLowerCase().includes(q)) ||
          (f.provisioningId &&
            (provMap[f.provisioningId]?.accountNumber ?? '').toLowerCase().includes(q)) ||
          (f.provisioningId && (provMap[f.provisioningId]?.name ?? '').toLowerCase().includes(q))
      )
    }

    if (statusFilter.length > 0) {
      result = result.filter((f) => statusFilter.includes(f.status))
    }

    if (typeFilter.length > 0) {
      result = result.filter((f) => typeFilter.includes(f.type))
    }

    return result
  }, [faults, search, statusFilter, typeFilter, userMap, provMap])

  const { pageItems, page, totalPages, setPage } = usePagination(filtered)

  function toggleStatus(s: string) {
    setStatusFilter((p) => (p.includes(s) ? p.filter((x) => x !== s) : [...p, s]))
  }

  function toggleType(t: string) {
    setTypeFilter((p) => (p.includes(t) ? p.filter((x) => x !== t) : [...p, t]))
  }

  const hasFilters = search || statusFilter.length > 0 || typeFilter.length > 0

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search title, ticket ref, account, agent..."
          className="max-w-sm"
        />
        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearch('')
              setStatusFilter([])
              setTypeFilter([])
            }}
          >
            <X className="size-3 mr-1" />
            Clear all
          </Button>
        )}
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Status</p>
        <div className="flex flex-wrap gap-2">
          {FAULT_STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => toggleStatus(s)}
              className={cn(
                'px-2.5 py-1 rounded-md text-xs font-medium border transition-all',
                FAULT_STATUS_COLOURS[s],
                statusFilter.includes(s)
                  ? 'ring-2 ring-offset-1 ring-foreground/30'
                  : 'hover:opacity-80'
              )}
            >
              {FAULT_STATUS_LABELS[s] ?? s}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Type</p>
        <div className="flex flex-wrap gap-2">
          {FAULT_TYPES.map((t) => (
            <button
              key={t}
              onClick={() => toggleType(t)}
              className={cn(
                'px-2.5 py-1 rounded-md text-xs font-medium border transition-all',
                FAULT_TYPE_COLOURS[t],
                typeFilter.includes(t)
                  ? 'ring-2 ring-offset-1 ring-foreground/30'
                  : 'hover:opacity-80'
              )}
            >
              {FAULT_TYPE_LABELS[t] ?? t}
            </button>
          ))}
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        {filtered.length} of {faults.length} faults
      </p>
      <FaultsTable faults={pageItems} userMap={userMap} provMap={provMap} />

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  )
}
