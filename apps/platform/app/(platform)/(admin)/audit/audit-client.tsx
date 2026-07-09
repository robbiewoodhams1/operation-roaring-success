'use client'

import { useState, useMemo } from 'react'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { Pagination, usePagination } from '@/components/pagination'
import { type AuditLog } from '@/lib/types'
import { AUDIT_ACTION_COLOURS, AUDIT_TABLE_LABELS } from '@/lib/constants'

function diffData(oldData: any, newData: any): { field: string; from: any; to: any }[] {
  if (!oldData || !newData) return []
  const keys = new Set([...Object.keys(oldData), ...Object.keys(newData)])
  const changes: { field: string; from: any; to: any }[] = []
  for (const key of keys) {
    if (JSON.stringify(oldData[key]) !== JSON.stringify(newData[key])) {
      changes.push({ field: key, from: oldData[key], to: newData[key] })
    }
  }
  return changes
}

function LogRow({ log, userName }: { log: AuditLog; userName: string }) {
  const [open, setOpen] = useState(false)
  const changes = diffData(log.oldData, log.newData)

  // Build a meaningful identifier from the data
  const data = log.newData ?? log.oldData

  const identifier =
    data?.account_number ??
    data?.company_name ??
    (data?.first_name ? `${data.first_name} ${data.last_name ?? ''}`.trim() : undefined) ??
    data?.email ??
    data?.service_type?.toUpperCase() ??
    log.id.slice(0, 8)

  // For updates, show a summary of what changed
  const changeSummary =
    changes.length > 0 ? changes.map((c) => c.field.replace(/_/g, ' ')).join(', ') : null

  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        className="w-full px-4 py-3 flex items-center gap-3 hover:bg-muted/30 transition-colors text-left"
        onClick={() => setOpen(!open)}
      >
        <Badge
          variant="outline"
          className={cn('text-xs shrink-0 w-16 justify-center', AUDIT_ACTION_COLOURS[log.action])}
        >
          {log.action}
        </Badge>
        <span className="text-xs font-medium text-muted-foreground w-24 shrink-0">
          {AUDIT_TABLE_LABELS[log.tableName] ?? log.tableName}
        </span>
        <span className="text-sm font-medium shrink-0">{identifier}</span>
        {changeSummary && (
          <span className="text-xs text-muted-foreground truncate flex-1">— {changeSummary}</span>
        )}
        {!changeSummary && <span className="flex-1" />}
        <span className="text-xs font-medium text-muted-foreground shrink-0">{userName}</span>
        <span className="text-xs text-muted-foreground shrink-0 w-36 text-right">
          {new Date(log.changedAt).toLocaleString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
        {open ? (
          <ChevronUp className="size-3.5 shrink-0" />
        ) : (
          <ChevronDown className="size-3.5 shrink-0" />
        )}
      </button>

      {open && (
        <div className="border-t bg-muted/10 px-4 py-3 space-y-3">
          {/* Meta row */}
          <div className="flex gap-6 text-xs text-muted-foreground pb-2 border-b">
            <span>
              <span className="font-medium text-foreground">Changed by</span> {userName}
            </span>
            <span>
              <span className="font-medium text-foreground">Record ID</span>{' '}
              <span className="font-mono">{log.id}</span>
            </span>
            <span>
              <span className="font-medium text-foreground">Table</span> {log.tableName}
            </span>
          </div>

          {log.action === 'INSERT' && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Created with</p>
              <div className="space-y-1">
                {Object.entries(log.newData ?? {}).map(
                  ([k, v]) =>
                    v !== null && (
                      <div key={k} className="flex gap-2 text-xs">
                        <span className="font-mono text-muted-foreground w-44 shrink-0">{k}</span>
                        <span className="text-foreground break-all">{String(v)}</span>
                      </div>
                    )
                )}
              </div>
            </div>
          )}

          {log.action === 'UPDATE' && changes.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">
                {changes.length} field{changes.length !== 1 ? 's' : ''} changed
              </p>
              <div className="space-y-2">
                {changes.map(({ field, from, to }) => (
                  <div key={field} className="text-xs bg-muted/20 rounded p-2">
                    <span className="font-mono font-medium">{field}</span>
                    <div className="flex items-start gap-2 mt-1 ml-2">
                      <div className="flex-1">
                        <span className="text-muted-foreground text-xs">from </span>
                        <span className="line-through text-red-600 break-all">
                          {String(from ?? '—')}
                        </span>
                      </div>
                      <span className="text-muted-foreground shrink-0">→</span>
                      <div className="flex-1">
                        <span className="text-muted-foreground text-xs">to </span>
                        <span className="text-green-600 break-all">{String(to ?? '—')}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {log.action === 'UPDATE' && changes.length === 0 && (
            <p className="text-xs text-muted-foreground">No field differences detected.</p>
          )}

          {log.action === 'DELETE' && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Deleted record</p>
              <div className="space-y-1">
                {Object.entries(log.oldData ?? {}).map(
                  ([k, v]) =>
                    v !== null && (
                      <div key={k} className="flex gap-2 text-xs">
                        <span className="font-mono text-muted-foreground w-44 shrink-0">{k}</span>
                        <span className="line-through text-red-600 break-all">{String(v)}</span>
                      </div>
                    )
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function AuditClient({
  logs,
  userNames,
}: {
  logs: AuditLog[]
  userNames: Record<string, string>
}) {
  const [search, setSearch] = useState('')
  const [actionFilter, setActionFilter] = useState<string[]>([])
  const [tableFilter, setTableFilter] = useState<string[]>([])
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'mtd' | 'custom'>('all')
  const [customDate, setCustomDate] = useState('')

  const tables = [...new Set(logs.map((l) => l.tableName))]

  const filtered = useMemo(() => {
    let result = [...logs]

    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(
        (l) =>
          l.id.toLowerCase().includes(q) ||
          l.recordId.toLowerCase().includes(q) ||
          l.tableName.includes(q) ||
          JSON.stringify(l.newData ?? {})
            .toLowerCase()
            .includes(q) ||
          JSON.stringify(l.oldData ?? {})
            .toLowerCase()
            .includes(q) ||
          (l.changedBy && userNames[l.changedBy]?.toLowerCase().includes(q))
      )
    }

    if (actionFilter.length > 0) {
      result = result.filter((l) => actionFilter.includes(l.action))
    }

    if (tableFilter.length > 0) {
      result = result.filter((l) => tableFilter.includes(l.tableName))
    }

    const now = new Date()

    if (dateFilter === 'today') {
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      result = result.filter((l) => new Date(l.changedAt) >= todayStart)
    } else if (dateFilter === 'mtd') {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      result = result.filter((l) => new Date(l.changedAt) >= monthStart)
    } else if (dateFilter === 'custom' && customDate) {
      const selected = new Date(customDate)
      const selectedEnd = new Date(customDate)
      selectedEnd.setDate(selectedEnd.getDate() + 1)
      result = result.filter((l) => {
        const d = new Date(l.changedAt)
        return d >= selected && d < selectedEnd
      })
    }

    return result
  }, [logs, search, actionFilter, tableFilter, userNames, dateFilter, customDate])

  const { pageItems, page, totalPages, setPage } = usePagination(filtered)

  function toggleFilter(value: string, state: string[], setter: (v: string[]) => void) {
    setter(state.includes(value) ? state.filter((x) => x !== value) : [...state, value])
  }

  return (
    <div className="p-6 w-full space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Audit Log</h1>
        <p className="text-sm text-muted-foreground mt-1">Audit changes across all tables</p>
      </div>

      <div className="space-y-3">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by table, value, or user..."
          className="max-w-sm"
        />

        {/* Action filters */}
        <div className="flex flex-wrap gap-2">
          {(['INSERT', 'UPDATE', 'DELETE'] as const).map((a) => (
            <button
              key={a}
              onClick={() => toggleFilter(a, actionFilter, setActionFilter)}
              className={cn(
                'px-2.5 py-1 rounded-md text-xs font-medium border transition-all',
                AUDIT_ACTION_COLOURS[a],
                actionFilter.includes(a)
                  ? 'ring-2 ring-offset-1 ring-foreground/30'
                  : 'hover:scale-103'
              )}
            >
              {a}
            </button>
          ))}
          <div className="w-px bg-border mx-1" />
          {tables.map((t) => (
            <button
              key={t}
              onClick={() => toggleFilter(t, tableFilter, setTableFilter)}
              className={cn(
                'px-2.5 py-1 rounded-md text-xs font-medium border transition-all',
                tableFilter.includes(t)
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-muted text-muted-foreground border-border hover:bg-muted/80'
              )}
            >
              {AUDIT_TABLE_LABELS[t] ?? t}
            </button>
          ))}
        </div>

        {/* Date filters */}
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Date</p>
          {(['all', 'today', 'mtd'] as const).map((d) => (
            <button
              key={d}
              onClick={() => setDateFilter(d)}
              className={cn(
                'px-2.5 py-1 rounded-md text-xs font-medium border transition-all',
                dateFilter === d
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-muted text-muted-foreground border-border hover:bg-muted/80'
              )}
            >
              {d === 'all' ? 'All' : d === 'today' ? 'Today' : 'Month to date'}
            </button>
          ))}
          <input
            type="date"
            value={customDate}
            onChange={(e) => {
              setCustomDate(e.target.value)
              setDateFilter('custom')
            }}
            className="h-7 px-2 rounded-md text-xs border bg-background text-foreground"
          />
          {dateFilter !== 'all' && (
            <button
              onClick={() => {
                setDateFilter('all')
                setCustomDate('')
              }}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Clear
            </button>
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          {filtered.length} of {logs.length} entries
        </p>
      </div>

      <div className="space-y-2">
        {pageItems.map((log) => (
          <LogRow
            key={log.id}
            log={log}
            userName={log.changedBy ? (userNames[log.changedBy] ?? 'Unknown') : 'System'}
          />
        ))}
        {filtered.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-8">No entries found.</p>
        )}
      </div>

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  )
}
