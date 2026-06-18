'use client'

import { useState, useMemo } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { DealsTable } from './deals-table'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { capitalise } from '@/components/capitalise'
import { type DealRow, type SortOption } from '@/lib/types'
import { DEAL_STATUS_COLOURS, DEAL_CONTRACT_LABELS } from '@/lib/constants'

export function DealsFilters({ deals }: { deals: DealRow[] }) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string[]>([])
  const [dealTypeFilter, setDealTypeFilter] = useState<string[]>([])
  const [contractFilter, setContractFilter] = useState<string[]>([])
  const [salesAgentFilter, setSalesAgentFilter] = useState<string[]>([])
  const [closingAgentFilter, setClosingAgentFilter] = useState<string[]>([])
  const [sort, setSort] = useState<SortOption>('newest')

  // Derive unique agents from data
  const salesAgents = useMemo(
    () => [...new Set(deals.map((d) => d.salesAgent).filter(Boolean))].sort(),
    [deals]
  )

  const closingAgents = useMemo(
    () => [...new Set(deals.map((d) => d.closingAgent).filter(Boolean))].sort(),
    [deals]
  )

  const filtered = useMemo(() => {
    let result = [...deals]

    // Search
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(
        (r) =>
          r.accountNumber?.toLowerCase().includes(q) ||
          (r.companyName ?? '').toLowerCase().includes(q) ||
          `${r.firstName} ${r.lastName}`.toLowerCase().includes(q) ||
          r.salesAgent?.toLowerCase().includes(q) ||
          r.closingAgent?.toLowerCase().includes(q)
      )
    }

    // Status
    if (statusFilter.length > 0) {
      result = result.filter((r) => statusFilter.includes(r.status))
    }

    // Deal type
    if (dealTypeFilter.length > 0) {
      result = result.filter((r) => dealTypeFilter.includes(r.dealType))
    }

    // Contract length
    if (contractFilter.length > 0) {
      result = result.filter((r) => r.contractLength && contractFilter.includes(r.contractLength))
    }

    // Sales agent
    if (salesAgentFilter.length > 0) {
      result = result.filter((r) => salesAgentFilter.includes(r.salesAgent))
    }

    // Closing agent
    if (closingAgentFilter.length > 0) {
      result = result.filter((r) => closingAgentFilter.includes(r.closingAgent))
    }

    // Sort
    result.sort((a, b) => {
      const dateA = a.dealDate ? new Date(a.dealDate).getTime() : 0
      const dateB = b.dealDate ? new Date(b.dealDate).getTime() : 0
      return sort === 'newest' ? dateB - dateA : dateA - dateB
    })

    return result
  }, [
    deals,
    search,
    statusFilter,
    dealTypeFilter,
    contractFilter,
    salesAgentFilter,
    closingAgentFilter,
    sort,
  ])

  function toggle(value: string, state: string[], setter: (v: string[]) => void) {
    setter(state.includes(value) ? state.filter((x) => x !== value) : [...state, value])
  }

  const activeFilterCount =
    statusFilter.length +
    dealTypeFilter.length +
    contractFilter.length +
    salesAgentFilter.length +
    closingAgentFilter.length

  function clearAll() {
    setSearch('')
    setStatusFilter([])
    setDealTypeFilter([])
    setContractFilter([])
    setSalesAgentFilter([])
    setClosingAgentFilter([])
    setSort('newest')
  }

  const FilterChip = ({
    label,
    active,
    onClick,
    colour,
  }: {
    label: string
    active: boolean
    onClick: () => void
    colour?: string | undefined
  }) => (
    <button
      onClick={onClick}
      className={cn(
        'inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border transition-all',
        colour
          ? cn(colour, active ? 'ring-2 ring-offset-1 ring-foreground/30' : 'hover:scale-103')
          : active
            ? 'bg-primary text-primary-foreground border-primary'
            : 'bg-muted text-muted-foreground border-border hover:bg-muted/80'
      )}
    >
      {label}
    </button>
  )

  return (
    <div className="space-y-4">
      {/* Search + sort */}
      <div className="flex flex-wrap gap-3">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search account, customer, agent..."
          className="max-w-sm"
        />
        <div className="flex gap-1">
          <Button
            variant={sort === 'newest' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSort('newest')}
          >
            Newest first
          </Button>
          <Button
            variant={sort === 'oldest' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSort('oldest')}
          >
            Oldest first
          </Button>
        </div>
        {(activeFilterCount > 0 || search) && (
          <Button variant="ghost" size="sm" onClick={clearAll}>
            <X className="size-3 mr-1" />
            Clear all
          </Button>
        )}
      </div>

      {/* Status */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Status</p>
        <div className="flex flex-wrap gap-2">
          {Object.keys(DEAL_STATUS_COLOURS).map((s) => (
            <FilterChip
              key={s}
              label={capitalise(s)}
              active={statusFilter.includes(s)}
              onClick={() => toggle(s, statusFilter, setStatusFilter)}
              colour={DEAL_STATUS_COLOURS[s]}
            />
          ))}
        </div>
      </div>

      {/* Deal type */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Deal type
        </p>
        <div className="flex gap-2">
          {['business', 'residential'].map((t) => (
            <FilterChip
              key={t}
              label={capitalise(t)}
              active={dealTypeFilter.includes(t)}
              onClick={() => toggle(t, dealTypeFilter, setDealTypeFilter)}
            />
          ))}
        </div>
      </div>

      {/* Contract length */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Contract
        </p>
        <div className="flex gap-2">
          {Object.entries(DEAL_CONTRACT_LABELS).map(([value, label]) => (
            <FilterChip
              key={value}
              label={label}
              active={contractFilter.includes(value)}
              onClick={() => toggle(value, contractFilter, setContractFilter)}
            />
          ))}
        </div>
      </div>

      {/* Sales agent */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Sales agent
        </p>
        <div className="flex flex-wrap gap-2">
          {salesAgents.map((a) => (
            <FilterChip
              key={a}
              label={a}
              active={salesAgentFilter.includes(a)}
              onClick={() => toggle(a, salesAgentFilter, setSalesAgentFilter)}
            />
          ))}
        </div>
      </div>

      {/* Closing agent */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Closing agent
        </p>
        <div className="flex flex-wrap gap-2">
          {closingAgents.map((a) => (
            <FilterChip
              key={a}
              label={a}
              active={closingAgentFilter.includes(a)}
              onClick={() => toggle(a, closingAgentFilter, setClosingAgentFilter)}
            />
          ))}
        </div>
      </div>

      {/* Results count */}
      <p className="text-xs text-muted-foreground">
        {filtered.length} of {deals.length} deals
      </p>

      <DealsTable deals={filtered} />
    </div>
  )
}
