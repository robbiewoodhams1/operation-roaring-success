'use client'

import { useMemo, useState } from 'react'
import { ChevronDown, ChevronUp, History } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import type { AuditLog } from '@/lib/types'

// Columns that are noise for a change history (housekeeping / identifiers).
const IGNORED_FIELDS = new Set([
  'id',
  'tenant_id',
  'deal_id',
  'provisioning_id',
  'service_type',
  'attempt',
  'created_at',
  'updated_at',
])

// Nice labels for the fields we track. Falls back to prettified snake_case.
const FIELD_LABELS: Record<string, string> = {
  status: 'Status',
  // Welcome calls
  wc1_outcome: 'WC1 outcome',
  wc1_comments: 'WC1 comments',
  wc2_outcome: 'WC2 outcome',
  wc2_comments: 'WC2 comments',
  wc3_outcome: 'WC3 outcome',
  wc3_comments: 'WC3 comments',
  // Router
  router_dispatched: 'Router dispatched',
  router_dispatch_ref: 'Router dispatch ref',
  router_tracking_number: 'Router tracking number',
  // Order
  proposed_live_date: 'Proposed live date',
  date_ordered: 'Date ordered',
  order_comments: 'Order comments',
  order_fault_ref: 'Order fault ref',
  provisioner: 'Provisioner',
  last_checked_at: 'Last checked at',
  last_checked_by: 'Last checked by',
  // Service
  reference: 'Reference',
  live_date: 'Live date',
  cancelled_date: 'Cancelled date',
  cancelled_by: 'Cancelled by',
  cancellation_reason: 'Cancellation reason',
  delayed_date: 'Delayed date',
  presumed_solve_date: 'Presumed solve date',
  delay_reason: 'Delay reason',
  notes: 'Notes',
}

const SERVICE_LABELS: Record<string, string> = {
  bb: 'Broadband',
  whc: 'WHC',
  nfon: 'NFON',
  mpf: 'MPF',
}

function fieldLabel(field: string): string {
  return FIELD_LABELS[field] ?? field.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase())
}

// Which section of the record a provisioning field belongs to.
function sectionForField(
  tableName: string,
  data: Record<string, unknown> | null | undefined,
  field: string
): string {
  if (tableName === 'provisioning_services') {
    const type = SERVICE_LABELS[String(data?.service_type)] ?? 'Service'
    const attempt =
      typeof data?.attempt === 'number' && data.attempt > 1 ? ` · attempt ${data.attempt}` : ''
    return `${type}${attempt}`
  }
  if (field.startsWith('wc')) return 'Welcome Calls'
  if (field.startsWith('router_')) return 'Router'
  return 'Order'
}

// Render a stored value verbatim so even a single-character change is visible.
function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—'
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  return String(value)
}

type ChangeRow = {
  key: string
  changedAt: Date | string
  changedBy: string | null
  section: string
  field: string
  from: unknown
  to: unknown
  action: string
}

function buildRows(logs: AuditLog[]): ChangeRow[] {
  const rows: ChangeRow[] = []

  for (const log of logs) {
    const data = log.newData ?? log.oldData

    if (log.action === 'INSERT') {
      rows.push({
        key: `${log.id}-created`,
        changedAt: log.changedAt,
        changedBy: log.changedBy,
        section: sectionForField(log.tableName, data, ''),
        field: '__created__',
        from: null,
        to: null,
        action: 'INSERT',
      })
      continue
    }

    if (log.action === 'DELETE') {
      rows.push({
        key: `${log.id}-deleted`,
        changedAt: log.changedAt,
        changedBy: log.changedBy,
        section: sectionForField(log.tableName, data, ''),
        field: '__deleted__',
        from: null,
        to: null,
        action: 'DELETE',
      })
      continue
    }

    // UPDATE — one row per changed field.
    const oldData = log.oldData ?? {}
    const newData = log.newData ?? {}
    const keys = new Set([...Object.keys(oldData), ...Object.keys(newData)])
    for (const field of keys) {
      if (IGNORED_FIELDS.has(field)) continue
      if (JSON.stringify(oldData[field]) === JSON.stringify(newData[field])) continue
      rows.push({
        key: `${log.id}-${field}`,
        changedAt: log.changedAt,
        changedBy: log.changedBy,
        section: sectionForField(log.tableName, newData, field),
        field,
        from: oldData[field],
        to: newData[field],
        action: 'UPDATE',
      })
    }
  }

  return rows
}

export function ProvisioningHistory({
  logs,
  userNames,
}: {
  logs: AuditLog[]
  userNames: Record<string, string>
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')

  const rows = useMemo(() => buildRows(logs), [logs])

  const filtered = useMemo(() => {
    if (!search.trim()) return rows
    const q = search.toLowerCase()
    return rows.filter((r) => {
      const who = r.changedBy ? (userNames[r.changedBy] ?? '') : 'system'
      return (
        fieldLabel(r.field).toLowerCase().includes(q) ||
        r.section.toLowerCase().includes(q) ||
        who.toLowerCase().includes(q) ||
        formatValue(r.from).toLowerCase().includes(q) ||
        formatValue(r.to).toLowerCase().includes(q)
      )
    })
  }, [rows, search, userNames])

  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        className="w-full px-4 py-3 flex items-center justify-between bg-muted/30 hover:bg-muted/40 transition-colors"
        onClick={() => setOpen(!open)}
      >
        <div className="flex items-center gap-2">
          <History className="size-4 text-muted-foreground" />
          <h2 className="text-sm font-medium">Change history</h2>
          <span className="text-xs text-muted-foreground">
            {rows.length} change{rows.length !== 1 ? 's' : ''}
          </span>
        </div>
        {open ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
      </button>

      {open && (
        <div className="divide-y">
          <div className="px-4 py-3">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter by field, section, value, or user..."
              className="h-8 max-w-sm"
            />
          </div>

          {filtered.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">
              {rows.length === 0 ? 'No changes recorded yet.' : 'No changes match your filter.'}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-muted-foreground border-b bg-muted/10">
                    <th className="px-4 py-2 font-medium whitespace-nowrap">When</th>
                    <th className="px-4 py-2 font-medium whitespace-nowrap">Changed by</th>
                    <th className="px-4 py-2 font-medium whitespace-nowrap">Section</th>
                    <th className="px-4 py-2 font-medium whitespace-nowrap">Field</th>
                    <th className="px-4 py-2 font-medium">From</th>
                    <th className="px-4 py-2 font-medium">To</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filtered.map((r) => (
                    <tr key={r.key} className="align-top hover:bg-muted/20">
                      <td className="px-4 py-2 text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(r.changedAt).toLocaleString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="px-4 py-2 text-xs whitespace-nowrap">
                        {r.changedBy ? (userNames[r.changedBy] ?? 'Unknown') : 'System'}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        <span className="text-xs text-muted-foreground">{r.section}</span>
                      </td>
                      {r.action !== 'UPDATE' ? (
                        <td className="px-4 py-2" colSpan={3}>
                          <Badge
                            variant="outline"
                            className={cn(
                              'text-xs',
                              r.action === 'INSERT'
                                ? 'bg-green-100 text-green-800 border-green-200'
                                : 'bg-red-100 text-red-800 border-red-200'
                            )}
                          >
                            {r.action === 'INSERT' ? 'Created' : 'Deleted'}
                          </Badge>
                        </td>
                      ) : (
                        <>
                          <td className="px-4 py-2 font-medium whitespace-nowrap">
                            {fieldLabel(r.field)}
                          </td>
                          <td className="px-4 py-2 max-w-[400px] w-[320px]">
                            <span
                              className="block truncate font-mono text-xs text-red-600 line-through"
                              title={formatValue(r.from)}
                            >
                              {formatValue(r.from)}
                            </span>
                          </td>

                          <td className="px-4 py-2 max-w-[400px] w-[320px]">
                            <span
                              className="block truncate font-mono text-xs text-green-700"
                              title={formatValue(r.to)}
                            >
                              {formatValue(r.to)}
                            </span>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
