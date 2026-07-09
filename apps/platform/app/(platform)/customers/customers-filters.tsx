'use client'

import { useState, useEffect, useTransition } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { CustomersTable } from './customers-table'
import { Pagination } from '@/components/pagination'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Customer } from '@roaring/db'
import { capitalise } from '@/components/capitalise'
import { CUSTOMER_STATUS_COLOURS, CUSTOMER_TYPE_COLOURS } from '@/lib/constants'

export function CustomersFilters({
  customers,
  total,
  page,
  totalPages,
}: {
  customers: Customer[]
  total: number
  page: number
  totalPages: number
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const [search, setSearch] = useState(searchParams.get('q') ?? '')
  const statusFilter = searchParams.get('status') ?? ''
  const typeFilter = searchParams.get('type') ?? 'all'

  // Debounce search input → update URL
  useEffect(() => {
    const timeout = setTimeout(() => {
      updateParams({ q: search || null, page: null })
    }, 400)
    return () => clearTimeout(timeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  function updateParams(updates: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString())
    for (const [key, value] of Object.entries(updates)) {
      if (value) params.set(key, value)
      else params.delete(key)
    }
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`)
    })
  }

  function toggleStatus(s: string) {
    updateParams({ status: statusFilter === s ? null : s, page: null })
  }

  function setType(t: string) {
    updateParams({ type: t === 'all' ? null : t, page: null })
  }

  function clearAll() {
    setSearch('')
    router.push(pathname)
  }

  function goToPage(p: number) {
    updateParams({ page: p === 1 ? null : String(p) })
  }

  const hasFilters = search || statusFilter || typeFilter !== 'all'

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search account, name, email, postcode, phone..."
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
                statusFilter === s ? 'ring-2 ring-offset-1 ring-foreground/30' : 'hover:scale-103'
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
              onClick={() => setType(t)}
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

      <p className={cn('text-xs text-muted-foreground', isPending && 'opacity-50')}>
        {total} customer{total !== 1 ? 's' : ''} match{total === 1 ? 'es' : ''}
      </p>

      <CustomersTable customers={customers} />

      <Pagination
        page={page}
        totalPages={totalPages}
        onPageChange={goToPage}
        isPending={isPending}
      />
    </div>
  )
}
