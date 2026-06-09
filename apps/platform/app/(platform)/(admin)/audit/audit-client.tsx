'use client'

import { useState, useMemo } from 'react'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { ChevronDown, ChevronUp } from 'lucide-react'

type AuditLog = {
  id: string
  tableName: string
  recordId: string
  action: string
  oldData: any
  newData: any
  changedBy: string | null
  changedAt: Date | string
}

const actionColours: Record<string, string> = {
  INSERT: 'bg-green-100 text-green-800 border-green-200',
  UPDATE: 'bg-blue-100 text-blue-800 border-blue-200',
  DELETE: 'bg-red-100 text-red-800 border-red-200',
}

const tableLabels: Record<string, string> = {
  customers: 'Customer',
  deals: 'Deal',
  provisioning: 'Provisioning',
  provisioning_services: 'Service',
  deal_services: 'Deal services',
  deal_pricing: 'Deal pricing',
  deal_billing: 'Deal billing',
  users: 'User',
}

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
  const identifier =
    log.newData?.account_number ??
    log.newData?.company_name ??
    log.oldData?.account_number ??
    log.oldData?.company_name ??
    log.recordId.slice(0, 8)

  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        className="w-full px-4 py-3 flex items-center gap-3 hover:bg-muted/30 transition-colors text-left"
        onClick={() => setOpen(!open)}
      >
        <Badge
          variant="outline"
          className={cn('text-xs shrink-0 w-16 justify-center', actionColours[log.action])}
        >
          {log.action}
        </Badge>
        <span className="text-xs font-medium text-muted-foreground w-28 shrink-0">
          {tableLabels[log.tableName] ?? log.tableName}
        </span>
        <span className="text-sm flex-1 truncate">{identifier}</span>
        <span className="text-xs text-muted-foreground shrink-0">{userName}</span>
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
          {log.action === 'INSERT' && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Created with</p>
              <div className="space-y-1">
                {Object.entries(log.newData ?? {}).map(
                  ([k, v]) =>
                    v !== null && (
                      <div key={k} className="flex gap-2 text-xs">
                        <span className="font-mono text-muted-foreground w-40 shrink-0">{k}</span>
                        <span className="text-foreground">{String(v)}</span>
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
                  <div key={field} className="text-xs">
                    <span className="font-mono text-muted-foreground">{field}</span>
                    <div className="flex items-center gap-2 mt-0.5 ml-2">
                      <span className="line-through text-red-600">{String(from ?? '—')}</span>
                      <span className="text-muted-foreground">→</span>
                      <span className="text-green-600">{String(to ?? '—')}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {log.action === 'DELETE' && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Deleted record</p>
              <div className="space-y-1">
                {Object.entries(log.oldData ?? {}).map(
                  ([k, v]) =>
                    v !== null && (
                      <div key={k} className="flex gap-2 text-xs">
                        <span className="font-mono text-muted-foreground w-40 shrink-0">{k}</span>
                        <span className="line-through text-red-600">{String(v)}</span>
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

  const tables = [...new Set(logs.map((l) => l.tableName))]

  const filtered = useMemo(() => {
    let result = [...logs]
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(
        (l) =>
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
    return result
  }, [logs, search, actionFilter, tableFilter, userNames])

  function toggleFilter(value: string, state: string[], setter: (v: string[]) => void) {
    setter(state.includes(value) ? state.filter((x) => x !== value) : [...state, value])
  }

  return (
    <div className="p-6 max-w-6xl space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Audit Log</h1>
        <p className="text-sm text-muted-foreground mt-1">Last 200 changes across all tables</p>
      </div>

      {/* Filters */}
      <div className="space-y-3">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by table, value, or user..."
          className="max-w-sm"
        />
        <div className="flex flex-wrap gap-2">
          {(['INSERT', 'UPDATE', 'DELETE'] as const).map((a) => (
            <button
              key={a}
              onClick={() => toggleFilter(a, actionFilter, setActionFilter)}
              className={cn(
                'px-2.5 py-1 rounded-md text-xs font-medium border transition-all',
                actionColours[a],
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
              {tableLabels[t] ?? t}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          {filtered.length} of {logs.length} entries
        </p>
      </div>

      {/* Log entries */}
      <div className="space-y-2">
        {filtered.map((log) => (
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
    </div>
  )
}
