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

const ServiceFilter = ({
  label,
  state,
  setter,
}: {
  label: string
  state: string[]
  setter: (v: string[]) => void
}) => (
  <div className="space-y-2">
    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
    <div className="flex flex-wrap gap-2">
      {SERVICE_STATUSES.map((s) => (
        <FilterChip
          key={s}
          label={capitalise(s).replace(/_/g, ' ')}
          active={state.includes(s)}
          onClick={() => setter(state.includes(s) ? state.filter((x) => x !== s) : [...state, s])}
          colour={SERVICE_STATUS_COLOURS[s]}
        />
      ))}
    </div>
  </div>
)

export function ProvisioningFilters({ rows }: { rows: ProvisioningRow[] }) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string[]>([])
  const [bbStatusFilter, setBbStatusFilter] = useState<string[]>([])
  const [whcStatusFilter, setWhcStatusFilter] = useState<string[]>([])
  const [nfonStatusFilter, setNfonStatusFilter] = useState<string[]>([])
  const [mpfBbStatusFilter, setMpfBbStatusFilter] = useState<string[]>([])
  const [mpfVoiceStatusFilter, setMpfVoiceStatusFilter] = useState<string[]>([])
  const [mobileStatusFilter, setMobileStatusFilter] = useState<string[]>([])
  const [wc1Filter, setWc1Filter] = useState<string[]>([])
  const [routerFilter, setRouterFilter] = useState<'all' | 'yes' | 'no' | 'not_needed'>('all')
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

    if (statusFilter.length > 0) result = result.filter((r) => statusFilter.includes(r.status))
    if (bbStatusFilter.length > 0)
      result = result.filter((r) => r.bbStatus && bbStatusFilter.includes(r.bbStatus))
    if (whcStatusFilter.length > 0)
      result = result.filter((r) => r.whcStatus && whcStatusFilter.includes(r.whcStatus))
    if (nfonStatusFilter.length > 0)
      result = result.filter((r) => r.nfonStatus && nfonStatusFilter.includes(r.nfonStatus))
    if (mpfBbStatusFilter.length > 0)
      result = result.filter((r) => r.mpfBbStatus && mpfBbStatusFilter.includes(r.mpfBbStatus))
    if (mpfVoiceStatusFilter.length > 0)
      result = result.filter(
        (r) => r.mpfVoiceStatus && mpfVoiceStatusFilter.includes(r.mpfVoiceStatus)
      )
    if (mobileStatusFilter.length > 0)
      result = result.filter((r) => r.mobileStatus && mobileStatusFilter.includes(r.mobileStatus))

    if (wc1Filter.length > 0)
      result = result.filter((r) => r.wc1Outcome && wc1Filter.includes(r.wc1Outcome))

    if (wcDoneFilter === 'done') {
      result = result.filter((r) => r.wc1Outcome === 'answered' || r.wc2Outcome === 'answered')
    } else if (wcDoneFilter === 'not_done') {
      result = result.filter((r) => r.wc1Outcome !== 'answered' && r.wc2Outcome !== 'answered')
    }

    if (routerFilter === 'yes') result = result.filter((r) => r.routerDispatched === 'yes')
    else if (routerFilter === 'no') result = result.filter((r) => r.routerDispatched === 'no')
    else if (routerFilter === 'not_needed')
      result = result.filter((r) => r.routerDispatched === 'not_needed')

    if (customerTypeFilter !== 'all')
      result = result.filter((r) => r.customerType === customerTypeFilter)

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
    nfonStatusFilter,
    mpfBbStatusFilter,
    mpfVoiceStatusFilter,
    mobileStatusFilter,
    wc1Filter,
    wcDoneFilter,
    routerFilter,
    sort,
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
    mpfBbStatusFilter.length +
    mpfVoiceStatusFilter.length +
    mobileStatusFilter.length +
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
    setMpfBbStatusFilter([])
    setMpfVoiceStatusFilter([])
    setMobileStatusFilter([])
    setWc1Filter([])
    setRouterFilter('all')
    setWcDoneFilter('all')
    setCustomerTypeFilter('all')
    setSort('newest')
  }

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

      <ServiceFilter label="BB status" state={bbStatusFilter} setter={setBbStatusFilter} />
      <ServiceFilter label="WHC status" state={whcStatusFilter} setter={setWhcStatusFilter} />
      <ServiceFilter label="NFON status" state={nfonStatusFilter} setter={setNfonStatusFilter} />
      <ServiceFilter
        label="MPF BB status"
        state={mpfBbStatusFilter}
        setter={setMpfBbStatusFilter}
      />
      <ServiceFilter
        label="MPF Voice status"
        state={mpfVoiceStatusFilter}
        setter={setMpfVoiceStatusFilter}
      />
      <ServiceFilter
        label="Mobile status"
        state={mobileStatusFilter}
        setter={setMobileStatusFilter}
      />

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
          {(['all', 'yes', 'no', 'not_needed'] as const).map((r) => (
            <FilterChip
              key={r}
              label={
                r === 'all'
                  ? 'All'
                  : r === 'yes'
                    ? 'Dispatched'
                    : r === 'not_needed'
                      ? 'Not needed'
                      : 'Not dispatched'
              }
              active={routerFilter === r}
              onClick={() => setRouterFilter(r)}
              colour={
                r === 'yes'
                  ? 'bg-green-100 text-green-800 border-green-200'
                  : r === 'not_needed'
                    ? 'bg-gray-100 text-gray-700 border-gray-200'
                    : r === 'no'
                      ? 'bg-red-100 text-red-800 border-red-200'
                      : undefined
              }
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
