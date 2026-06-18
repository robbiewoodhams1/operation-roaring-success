'use client'

import { useState, useMemo } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { CustomersTable } from './customers-table'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Customer } from '@roaring/db'
import { capitalise } from '@/components/capitalise'
import { CUSTOMER_STATUS_COLOURS, CUSTOMER_TYPE_COLOURS } from '@/lib/constants'

export function CustomersFilters({ customers }: { customers: Customer[] }) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string[]>([])
  const [typeFilter, setTypeFilter] = useState<'all' | 'business' | 'residential'>('all')

  const filtered = useMemo(() => {
    let result = [...customers]

    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(
        (c) =>
          c.accountNumber.toLowerCase().includes(q) ||
          (c.companyName ?? '').toLowerCase().includes(q) ||
          `${c.firstName} ${c.lastName}`.toLowerCase().includes(q) ||
          (c.email ?? '').toLowerCase().includes(q) ||
          (c.postcode ?? '').toLowerCase().includes(q)
      )
    }

    if (typeFilter !== 'all') {
      result = result.filter((c) => c.type === typeFilter)
    }

    if (statusFilter.length > 0) {
      result = result.filter((c) => statusFilter.includes(c.status))
    }

    return result
  }, [customers, search, statusFilter, typeFilter])

  function toggleStatus(s: string) {
    setStatusFilter((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]))
  }

  function clearAll() {
    setSearch('')
    setTypeFilter('all')
    setStatusFilter([])
  }

  const hasFilters = search || statusFilter.length > 0 || typeFilter !== 'all'

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search account, name, email, postcode..."
          className="max-w-sm"
        />
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearAll}>
            <X className="size-3 mr-1" />
            Clear all
          </Button>
        )}
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Status</p>
        <div className="flex flex-wrap gap-2">
          {Object.keys(CUSTOMER_STATUS_COLOURS).map((s) => (
            <button
              key={s}
              onClick={() => toggleStatus(s)}
              className={cn(
                'inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border transition-all',
                CUSTOMER_STATUS_COLOURS[s],
                statusFilter.includes(s)
                  ? 'ring-2 ring-offset-1 ring-foreground/30'
                  : 'hover:scale-103'
              )}
            >
              {capitalise(s).replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Type</p>
        <div className="flex flex-wrap gap-2">
          {(['all', 'business', 'residential'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={cn(
                'inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border transition-all',
                t === 'all'
                  ? typeFilter === 'all'
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-muted text-muted-foreground border-border hover:bg-muted/80'
                  : cn(
                      CUSTOMER_TYPE_COLOURS[t],
                      typeFilter === t
                        ? 'ring-2 ring-offset-1 ring-foreground/30'
                        : 'hover:scale-103'
                    )
              )}
            >
              {t === 'all' ? 'All' : capitalise(t)}
            </button>
          ))}
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        {filtered.length} of {customers.length} customers
      </p>

      <CustomersTable customers={filtered} />
    </div>
  )
}
