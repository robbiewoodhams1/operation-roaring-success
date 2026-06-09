'use client'

import { useState, useTransition, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Search, Building2, FileText, Wifi, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { search } from './actions'

type SearchResult = {
  type: 'customer' | 'deal' | 'provisioning'
  id: string
  accountNumber: string
  title: string
  subtitle: string
  status: string | null
  href: string
}

const typeColours = {
  customer: 'bg-blue-100 text-blue-800 border-blue-200',
  deal: 'bg-purple-100 text-purple-800 border-purple-200',
  provisioning: 'bg-green-100 text-green-800 border-green-200',
}

const typeIcons = {
  customer: Building2,
  deal: FileText,
  provisioning: Wifi,
}

export function SearchClient({ tenantId }: { tenantId: string }) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [hasSearched, setHasSearched] = useState(false)
  const [isPending, startTransition] = useTransition()

  const handleSearch = useCallback(
    (q: string) => {
      setQuery(q)
      if (q.trim().length < 2) {
        setResults([])
        setHasSearched(false)
        return
      }
      startTransition(async () => {
        const res = await search(tenantId, q.trim())
        setResults(res)
        setHasSearched(true)
      })
    },
    [tenantId]
  )

  const grouped = results.reduce(
    (acc, r) => {
      if (!acc[r.type]) acc[r.type] = []
      acc[r.type]!.push(r)
      return acc
    },
    {} as Record<string, SearchResult[]>
  )

  const typeOrder: ('customer' | 'deal' | 'provisioning')[] = ['customer', 'deal', 'provisioning']
  const typeLabels = { customer: 'Customers', deal: 'Deals', provisioning: 'Provisioning' }

  return (
    <div className="w-fullspace-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          autoFocus
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Search by account number, name, company, postcode, reference..."
          className="pl-9 h-11"
        />
        {isPending && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground animate-spin" />
        )}
      </div>

      {hasSearched && results.length === 0 && !isPending && (
        <p className="text-sm text-muted-foreground text-center py-8">
          No results for <span className="font-medium">"{query}"</span>
        </p>
      )}

      {results.length > 0 && (
        <div className="space-y-4 mt-2">
          <p className="text-xs text-muted-foreground">
            {results.length} result{results.length !== 1 ? 's' : ''}
          </p>
          {typeOrder.map((type) => {
            const items = grouped[type]
            if (!items?.length) return null
            const Icon = typeIcons[type]
            return (
              <div key={type} className="space-y-1">
                <div className="flex items-center gap-2 py-1">
                  <Icon className="size-3.5 text-muted-foreground" />
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    {typeLabels[type]} ({items.length})
                  </p>
                </div>
                <div className="border rounded-lg divide-y overflow-hidden">
                  {items.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => router.push(r.href)}
                      className="w-full flex items-center gap-4 px-4 py-3 hover:bg-muted/50 transition-colors text-left"
                    >
                      <span className="font-mono text-xs text-muted-foreground w-20 shrink-0">
                        {r.accountNumber}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{r.title}</p>
                        {r.subtitle && (
                          <p className="text-xs text-muted-foreground truncate">{r.subtitle}</p>
                        )}
                      </div>
                      {r.status && (
                        <Badge
                          variant="outline"
                          className={cn('text-xs shrink-0', typeColours[r.type])}
                        >
                          {r.status}
                        </Badge>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {!hasSearched && (
        <div className="text-center py-12 space-y-2">
          <Search className="size-8 text-muted-foreground/40 mx-auto" />
          <p className="text-sm text-muted-foreground">Start typing to search</p>
          <p className="text-xs text-muted-foreground">
            Searches customers, deals, provisioning, references and order numbers
          </p>
        </div>
      )}
    </div>
  )
}
