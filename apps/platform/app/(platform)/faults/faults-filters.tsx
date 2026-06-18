'use client'

import { useState, useMemo } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { FaultsTable } from './faults-table'

const STATUS_OPTIONS = ['outstanding', 'in_progress', 'resolved']
const TYPE_OPTIONS = ['bb', 'line', 'upgrade', 'dfb', 'provisioning', 'mobile', 'ticket']

const statusColours: Record<string, string> = {
  outstanding: 'bg-red-100 text-red-800 border-red-200',
  in_progress: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  resolved: 'bg-green-100 text-green-800 border-green-200',
}

const typeColours: Record<string, string> = {
  bb: 'bg-blue-100 text-blue-800 border-blue-200',
  line: 'bg-purple-100 text-purple-800 border-purple-200',
  upgrade: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  dfb: 'bg-orange-100 text-orange-800 border-orange-200',
  provisioning: 'bg-cyan-100 text-cyan-800 border-cyan-200',
  mobile: 'bg-pink-100 text-pink-800 border-pink-200',
  ticket: 'bg-gray-100 text-gray-700 border-gray-200',
}

type FaultRow = {
  id: string
  title: string
  type: string
  status: string
  ticketRef: string | null
  openedAt: Date | string
  resolvedAt: Date | string | null
  assignedTo: string | null
  provisioningId: string | null
  createdAt: Date | string
}

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
          {STATUS_OPTIONS.map((s) => (
            <button
              key={s}
              onClick={() => toggleStatus(s)}
              className={cn(
                'px-2.5 py-1 rounded-md text-xs font-medium border transition-all',
                statusColours[s],
                statusFilter.includes(s)
                  ? 'ring-2 ring-offset-1 ring-foreground/30'
                  : 'hover:opacity-80'
              )}
            >
              {s.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Type</p>
        <div className="flex flex-wrap gap-2">
          {TYPE_OPTIONS.map((t) => (
            <button
              key={t}
              onClick={() => toggleType(t)}
              className={cn(
                'px-2.5 py-1 rounded-md text-xs font-medium border transition-all',
                typeColours[t],
                typeFilter.includes(t)
                  ? 'ring-2 ring-offset-1 ring-foreground/30'
                  : 'hover:opacity-80'
              )}
            >
              {t.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        {filtered.length} of {faults.length} faults
      </p>
      <FaultsTable faults={filtered} userMap={userMap} provMap={provMap} />
    </div>
  )
}
