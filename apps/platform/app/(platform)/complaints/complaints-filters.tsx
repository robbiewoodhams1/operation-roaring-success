'use client'

import { useState, useMemo } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ComplaintsTable } from './complaints-table'
import { type ComplaintRow } from '@/lib/types'
import {
  COMPLAINT_STATUSES,
  COMPLAINT_TYPES,
  COMPLAINT_STATUS_COLOURS,
  COMPLAINT_TYPE_COLOURS,
  COMPLAINT_STATUS_LABELS,
  COMPLAINT_TYPE_LABELS,
} from '@/lib/constants'

export function ComplaintsFilters({
  complaints,
  userMap,
  provMap,
}: {
  complaints: ComplaintRow[]
  userMap: Record<string, string>
  provMap: Record<string, { accountNumber: string; name: string }>
}) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string[]>([])
  const [typeFilter, setTypeFilter] = useState<string[]>([])

  const filtered = useMemo(() => {
    let result = [...complaints]

    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(
        (c) =>
          c.title.toLowerCase().includes(q) ||
          (c.ticketRef ?? '').toLowerCase().includes(q) ||
          (c.assignedTo && (userMap[c.assignedTo] ?? '').toLowerCase().includes(q)) ||
          (c.provisioningId &&
            (provMap[c.provisioningId]?.accountNumber ?? '').toLowerCase().includes(q)) ||
          (c.provisioningId && (provMap[c.provisioningId]?.name ?? '').toLowerCase().includes(q))
      )
    }

    if (statusFilter.length > 0) {
      result = result.filter((c) => statusFilter.includes(c.status))
    }

    if (typeFilter.length > 0) {
      result = result.filter((c) => typeFilter.includes(c.type))
    }

    return result
  }, [complaints, search, statusFilter, typeFilter, userMap, provMap])

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
          {COMPLAINT_STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => toggleStatus(s)}
              className={cn(
                'px-2.5 py-1 rounded-md text-xs font-medium border transition-all',
                COMPLAINT_STATUS_COLOURS[s],
                statusFilter.includes(s)
                  ? 'ring-2 ring-offset-1 ring-foreground/30'
                  : 'hover:opacity-80'
              )}
            >
              {COMPLAINT_STATUS_LABELS[s] ?? s}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Type</p>
        <div className="flex flex-wrap gap-2">
          {COMPLAINT_TYPES.map((t) => (
            <button
              key={t}
              onClick={() => toggleType(t)}
              className={cn(
                'px-2.5 py-1 rounded-md text-xs font-medium border transition-all',
                COMPLAINT_TYPE_COLOURS[t],
                typeFilter.includes(t)
                  ? 'ring-2 ring-offset-1 ring-foreground/30'
                  : 'hover:opacity-80'
              )}
            >
              {COMPLAINT_TYPE_LABELS[t] ?? t}
            </button>
          ))}
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        {filtered.length} of {complaints.length} complaints
      </p>
      <ComplaintsTable complaints={filtered} userMap={userMap} provMap={provMap} />
    </div>
  )
}
