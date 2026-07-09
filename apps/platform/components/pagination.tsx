'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

export const PAGE_SIZE = 50

/**
 * Client-side pagination for an already-filtered list. Resets to the first page
 * whenever the filtered result set changes (e.g. a search or filter is applied).
 *
 * Pass a memoised `items` array so its reference is stable between renders — the
 * reset is triggered by a change in reference, following React's "adjust state
 * during render" pattern (no effect, so no cascading re-render).
 */
export function usePagination<T>(items: T[], pageSize: number = PAGE_SIZE) {
  const [page, setPage] = useState(1)
  const [prevItems, setPrevItems] = useState(items)

  if (items !== prevItems) {
    setPrevItems(items)
    setPage(1)
  }

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize))
  const currentPage = Math.min(page, totalPages)
  const start = (currentPage - 1) * pageSize
  const pageItems = items.slice(start, start + pageSize)

  return { pageItems, page: currentPage, totalPages, setPage }
}

export function Pagination({
  page,
  totalPages,
  onPageChange,
  isPending,
}: {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
  isPending?: boolean
}) {
  if (totalPages <= 1) return null

  return (
    <div className="flex items-center justify-between pt-2">
      <p className="text-xs text-muted-foreground">
        Page {page} of {totalPages}
      </p>
      <div className="flex gap-1">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1 || isPending}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft className="size-3.5 mr-1" />
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= totalPages || isPending}
          onClick={() => onPageChange(page + 1)}
        >
          Next
          <ChevronRight className="size-3.5 ml-1" />
        </Button>
      </div>
    </div>
  )
}
