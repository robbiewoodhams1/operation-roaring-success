'use client'

import { useState, useMemo } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { TransferCeasesTable } from './transfers-table'
import { Pagination, usePagination } from '@/components/pagination'
import {
  TRANSFER_CEASE_TYPES,
  TRANSFER_CEASE_STATUSES,
  TRANSFER_CEASE_TYPE_COLOURS,
  TRANSFER_CEASE_STATUS_COLOURS,
  TRANSFER_CEASE_TYPE_LABELS,
  TRANSFER_CEASE_STATUS_LABELS,
} from '@/lib/constants'

type RecordRow = {
  id: string
  type: string
  status: string
  openedAt: Date | string
  completedAt: Date | string | null
  assignedTo: string | null
  provisioningId: string | null
  createdAt: Date | string
}

export function TransferCeasesFilters({
  records,
  userMap,
  provMap,
}: {
  records: RecordRow[]
  userMap: Record<string, string>
  provMap: Record<string, { accountNumber: string; name: string }>
}) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string[]>([])
  const [typeFilter, setTypeFilter] = useState<string[]>([])

  const filtered = useMemo(() => {
    let result = [...records]
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(
        (r) =>
          (r.assignedTo && (userMap[r.assignedTo] ?? '').toLowerCase().includes(q)) ||
          (r.provisioningId &&
            (provMap[r.provisioningId]?.accountNumber ?? '').toLowerCase().includes(q)) ||
          (r.provisioningId && (provMap[r.provisioningId]?.name ?? '').toLowerCase().includes(q))
      )
    }
    if (statusFilter.length > 0) result = result.filter((r) => statusFilter.includes(r.status))
    if (typeFilter.length > 0) result = result.filter((r) => typeFilter.includes(r.type))
    return result
  }, [records, search, statusFilter, typeFilter, userMap, provMap])

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
          placeholder="Search account, agent..."
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
          {TRANSFER_CEASE_STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => toggleStatus(s)}
              className={cn(
                'px-2.5 py-1 rounded-md text-xs font-medium border transition-all',
                TRANSFER_CEASE_STATUS_COLOURS[s],
                statusFilter.includes(s)
                  ? 'ring-2 ring-offset-1 ring-foreground/30'
                  : 'hover:opacity-80'
              )}
            >
              {TRANSFER_CEASE_STATUS_LABELS[s] ?? s}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Type</p>
        <div className="flex flex-wrap gap-2">
          {TRANSFER_CEASE_TYPES.map((t) => (
            <button
              key={t}
              onClick={() => toggleType(t)}
              className={cn(
                'px-2.5 py-1 rounded-md text-xs font-medium border transition-all',
                TRANSFER_CEASE_TYPE_COLOURS[t],
                typeFilter.includes(t)
                  ? 'ring-2 ring-offset-1 ring-foreground/30'
                  : 'hover:opacity-80'
              )}
            >
              {TRANSFER_CEASE_TYPE_LABELS[t] ?? t}
            </button>
          ))}
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        {filtered.length} of {records.length} records
      </p>
      <TransferCeasesTable records={pageItems} userMap={userMap} provMap={provMap} />

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  )
}
