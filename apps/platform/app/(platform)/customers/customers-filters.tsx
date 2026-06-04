'use client'

import { useState, useMemo } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { CustomersTable } from './customers-table'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Customer } from '@roaring/db'

const statusColours: Record<string, string> = {
  active: 'bg-green-100 text-green-800 border-green-200',
  prospect: 'bg-blue-100 text-blue-800 border-blue-200',
  at_risk: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  churned: 'bg-red-100 text-red-800 border-red-200',
}

const typeColours: Record<string, string> = {
  business: 'bg-purple-100 text-purple-800 border-purple-200',
  residential: 'bg-orange-100 text-orange-800 border-orange-200',
}

export function CustomersFilters({ customers }: { customers: Customer[] }) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string[]>([])
  const [typeFilter, setTypeFilter] = useState<string[]>([])

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

    if (typeFilter.length > 0) {
      result = result.filter((c) => typeFilter.includes(c.type))
    }

    if (statusFilter.length > 0) {
      result = result.filter((c) => statusFilter.includes(c.status))
    }

    return result
  }, [customers, search, statusFilter])

  function toggleStatus(s: string) {
    setStatusFilter((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]))
  }

  function clearAll() {
    setSearch('')
    setTypeFilter([])
    setStatusFilter([])
  }

  const hasFilters = search || statusFilter.length > 0 || typeFilter.length > 0

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
          {Object.keys(statusColours).map((s) => (
            <button
              key={s}
              onClick={() => toggleStatus(s)}
              className={cn(
                'inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border transition-all',
                statusColours[s],
                statusFilter.includes(s)
                  ? 'ring-2 ring-offset-1 ring-foreground/30'
                  : 'hover:scale-103'
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
          {Object.keys(typeColours).map((t) => (
            <button
              key={t}
              onClick={() =>
                setTypeFilter((prev) =>
                  prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]
                )
              }
              className={cn(
                'inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border transition-all',
                typeColours[t],
                typeFilter.includes(t)
                  ? 'ring-2 ring-offset-1 ring-foreground/30'
                  : 'hover:scale-103'
              )}
            >
              {t}
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
