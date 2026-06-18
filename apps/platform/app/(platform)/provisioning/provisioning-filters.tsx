'use client'

import { useState, useMemo } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ProvisioningTable } from './provisioning-table'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { capitalise } from '@/components/capitalise'
import { type ProvisioningRow, type SortOption } from '@/lib/types'
import {
  PROV_STATUS_COLOURS,
  PROV_STATUS_LABELS,
  SERVICE_STATUS_COLOURS,
  SERVICE_STATUSES,
  WC_COLOURS,
  WC_OUTCOMES,
} from '@/lib/constants'

export function ProvisioningFilters({ rows }: { rows: ProvisioningRow[] }) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string[]>([])
  const [bbStatusFilter, setBbStatusFilter] = useState<string[]>([])
  const [whcStatusFilter, setWhcStatusFilter] = useState<string[]>([])
  const [nfonStatusFilter, setNfonStatusFilter] = useState<string[]>([])
  const [mpfStatusFilter, setMpfStatusFilter] = useState<string[]>([])
  const [wc1Filter, setWc1Filter] = useState<string[]>([])
  const [routerFilter, setRouterFilter] = useState<'all' | 'dispatched' | 'not_dispatched'>('all')
  const [wcDoneFilter, setWcDoneFilter] = useState<'all' | 'done' | 'not_done'>('all')
  const [sort, setSort] = useState<SortOption>('newest')
  const [customerTypeFilter, setCustomerTypeFilter] = useState<'all' | 'business' | 'residential'>(
    'all'
  )

  const filtered = useMemo(() => {
    let result = [...rows]

    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(
        (r) =>
          r.accountNumber?.toLowerCase().includes(q) ||
          (r.companyName ?? '').toLowerCase().includes(q) ||
          `${r.firstName} ${r.lastName}`.toLowerCase().includes(q) ||
          r.provisioner?.toLowerCase().includes(q) ||
          r.salesAgent?.toLowerCase().includes(q)
      )
    }

    if (statusFilter.length > 0) {
      result = result.filter((r) => statusFilter.includes(r.status))
    }

    if (bbStatusFilter.length > 0) {
      result = result.filter((r) => r.bbStatus && bbStatusFilter.includes(r.bbStatus))
    }

    if (whcStatusFilter.length > 0) {
      result = result.filter((r) => r.whcStatus && whcStatusFilter.includes(r.whcStatus))
    }

    if (wc1Filter.length > 0) {
      result = result.filter((r) => r.wc1Outcome && wc1Filter.includes(r.wc1Outcome))
    }

    if (wcDoneFilter === 'done') {
      result = result.filter((r) => r.wc1Outcome === 'answered' || r.wc2Outcome === 'answered')
    } else if (wcDoneFilter === 'not_done') {
      result = result.filter((r) => r.wc1Outcome !== 'answered' && r.wc2Outcome !== 'answered')
    }

    if (routerFilter === 'dispatched') {
      result = result.filter((r) => r.routerDispatched)
    } else if (routerFilter === 'not_dispatched') {
      result = result.filter((r) => !r.routerDispatched)
    }

    if (nfonStatusFilter.length > 0) {
      result = result.filter((r) => r.nfonStatus && nfonStatusFilter.includes(r.nfonStatus))
    }
    if (mpfStatusFilter.length > 0) {
      result = result.filter((r) => r.mpfStatus && mpfStatusFilter.includes(r.mpfStatus))
    }

    if (customerTypeFilter !== 'all') {
      result = result.filter((r) => r.customerType === customerTypeFilter)
    }

    result.sort((a, b) => {
      const dateA = a.dealDate ? new Date(a.dealDate).getTime() : 0
      const dateB = b.dealDate ? new Date(b.dealDate).getTime() : 0
      return sort === 'newest' ? dateB - dateA : dateA - dateB
    })

    return result
  }, [
    rows,
    search,
    statusFilter,
    bbStatusFilter,
    whcStatusFilter,
    wc1Filter,
    wcDoneFilter,
    routerFilter,
    sort,
    nfonStatusFilter,
    mpfStatusFilter,
    customerTypeFilter,
  ])

  function toggle(value: string, state: string[], setter: (v: string[]) => void) {
    setter(state.includes(value) ? state.filter((x) => x !== value) : [...state, value])
  }

  const activeFilterCount =
    statusFilter.length +
    bbStatusFilter.length +
    whcStatusFilter.length +
    nfonStatusFilter.length +
    mpfStatusFilter.length +
    wc1Filter.length +
    (customerTypeFilter !== 'all' ? 1 : 0) +
    (routerFilter !== 'all' ? 1 : 0) +
    (wcDoneFilter !== 'all' ? 1 : 0)

  function clearAll() {
    setSearch('')
    setStatusFilter([])
    setBbStatusFilter([])
    setWhcStatusFilter([])
    setNfonStatusFilter([])
    setMpfStatusFilter([])
    setWc1Filter([])
    setRouterFilter('all')
    setWcDoneFilter('all')
    setCustomerTypeFilter('all')
    setSort('newest')
  }

  const FilterChip = ({
    label,
    active,
    onClick,
    colour,
  }: {
    label: string | undefined
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
          placeholder="Search account, customer, provisioner..."
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

      {/* Overall status */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Overall status
        </p>
        <div className="flex flex-wrap gap-2">
          {Object.keys(PROV_STATUS_LABELS).map((s) => (
            <FilterChip
              key={s}
              label={PROV_STATUS_LABELS[s]}
              active={statusFilter.includes(s)}
              onClick={() => toggle(s, statusFilter, setStatusFilter)}
              colour={PROV_STATUS_COLOURS[s]}
            />
          ))}
        </div>
      </div>

      {/* BB status */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          BB status
        </p>
        <div className="flex flex-wrap gap-2">
          {SERVICE_STATUSES.map((s) => (
            <FilterChip
              key={s}
              label={capitalise(s).replace('_', ' ')}
              active={bbStatusFilter.includes(s)}
              onClick={() => toggle(s, bbStatusFilter, setBbStatusFilter)}
              colour={SERVICE_STATUS_COLOURS[s]}
            />
          ))}
        </div>
      </div>

      {/* WHC status */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          WHC status
        </p>
        <div className="flex flex-wrap gap-2">
          {SERVICE_STATUSES.map((s) => (
            <FilterChip
              key={s}
              label={capitalise(s).replace('_', ' ')}
              active={whcStatusFilter.includes(s)}
              onClick={() => toggle(s, whcStatusFilter, setWhcStatusFilter)}
              colour={SERVICE_STATUS_COLOURS[s]}
            />
          ))}
        </div>
      </div>

      {/* NFON status */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          NFON status
        </p>
        <div className="flex flex-wrap gap-2">
          {SERVICE_STATUSES.map((s) => (
            <FilterChip
              key={s}
              label={capitalise(s).replace('_', ' ')}
              active={nfonStatusFilter.includes(s)}
              onClick={() => toggle(s, nfonStatusFilter, setNfonStatusFilter)}
              colour={SERVICE_STATUS_COLOURS[s]}
            />
          ))}
        </div>
      </div>

      {/* MPF status */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          MPF status
        </p>
        <div className="flex flex-wrap gap-2">
          {SERVICE_STATUSES.map((s) => (
            <FilterChip
              key={s}
              label={capitalise(s).replace('_', ' ')}
              active={mpfStatusFilter.includes(s)}
              onClick={() => toggle(s, mpfStatusFilter, setMpfStatusFilter)}
              colour={SERVICE_STATUS_COLOURS[s]}
            />
          ))}
        </div>
      </div>

      {/* Welcome call */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Welcome call
        </p>
        <div className="flex flex-wrap gap-2">
          {(['all', 'done', 'not_done'] as const).map((w) => (
            <FilterChip
              key={w}
              label={w === 'all' ? 'All' : w === 'done' ? 'Done' : 'Not Done'}
              active={wcDoneFilter === w}
              onClick={() => setWcDoneFilter(w)}
            />
          ))}
          <div className="w-px bg-border mx-1" />
          {WC_OUTCOMES.map((o) => (
            <FilterChip
              key={o}
              label={capitalise(o).replace('_', ' ')}
              active={wc1Filter.includes(o)}
              onClick={() => toggle(o, wc1Filter, setWc1Filter)}
              colour={WC_COLOURS[o]}
            />
          ))}
        </div>
      </div>

      {/* Customer type */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Type</p>
        <div className="flex gap-2">
          {(['all', 'business', 'residential'] as const).map((t) => (
            <FilterChip
              key={t}
              label={t === 'all' ? 'All' : capitalise(t)}
              active={customerTypeFilter === t}
              onClick={() => setCustomerTypeFilter(t)}
              colour={
                t === 'business'
                  ? 'bg-purple-100 text-purple-800 border-purple-200'
                  : t === 'residential'
                    ? 'bg-orange-100 text-orange-800 border-orange-200'
                    : undefined
              }
            />
          ))}
        </div>
      </div>

      {/* Router */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Router</p>
        <div className="flex gap-2">
          {(['all', 'dispatched', 'not_dispatched'] as const).map((r) => (
            <FilterChip
              key={r}
              label={r === 'all' ? 'All' : r === 'dispatched' ? 'Dispatched' : 'Not dispatched'}
              active={routerFilter === r}
              onClick={() => setRouterFilter(r)}
            />
          ))}
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        {filtered.length} of {rows.length} orders
      </p>

      <ProvisioningTable rows={filtered} />
    </div>
  )
}
