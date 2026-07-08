'use client'

import { useMemo, useState } from 'react'
import { ChevronDown, ChevronUp, History } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import type { AuditLog } from '@/lib/types'

// Housekeeping columns that are noise for a change history. Foreign keys
// (anything ending in _id) are skipped too — they don't change meaningfully
// from a record's own page.
const DEFAULT_IGNORED = new Set(['id', 'tenant_id', 'created_at', 'updated_at'])

function prettify(name: string): string {
  return name.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase())
}

// Render a stored value verbatim so even a single-character change is visible.
// User ids are swapped for names when we know them (e.g. assigned_to).
function formatValue(value: unknown, userNames: Record<string, string>): string {
  if (value === null || value === undefined || value === '') return '—'
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  const str = String(value)
  return userNames[str] ?? str
}

type SectionForField = (
  tableName: string,
  data: Record<string, unknown> | null | undefined,
  field: string
) => string

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

function buildRows(
  logs: AuditLog[],
  ignored: Set<string>,
  sectionForField: SectionForField
): ChangeRow[] {
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
      if (ignored.has(field) || field.endsWith('_id')) continue
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

export function ChangeHistory({
  logs,
  userNames,
  fieldLabels = {},
  ignoredFields = [],
  tableLabels = {},
  sectionForField,
}: {
  logs: AuditLog[]
  userNames: Record<string, string>
  /** Nice labels for tracked fields; falls back to prettified snake_case. */
  fieldLabels?: Record<string, string>
  /** Extra fields to hide beyond the housekeeping defaults. */
  ignoredFields?: string[]
  /** Section label per table name; falls back to prettified snake_case. */
  tableLabels?: Record<string, string>
  /** Full control over the section label, when a table label isn't enough. */
  sectionForField?: SectionForField
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')

  const fieldLabel = (field: string): string => fieldLabels[field] ?? prettify(field)

  const rows = useMemo(() => {
    const ignored = new Set([...DEFAULT_IGNORED, ...ignoredFields])
    const section: SectionForField =
      sectionForField ?? ((tableName) => tableLabels[tableName] ?? prettify(tableName))
    return buildRows(logs, ignored, section)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logs])

  const filtered = useMemo(() => {
    if (!search.trim()) return rows
    const q = search.toLowerCase()
    return rows.filter((r) => {
      const who = r.changedBy ? (userNames[r.changedBy] ?? '') : 'system'
      return (
        fieldLabel(r.field).toLowerCase().includes(q) ||
        r.section.toLowerCase().includes(q) ||
        who.toLowerCase().includes(q) ||
        formatValue(r.from, userNames).toLowerCase().includes(q) ||
        formatValue(r.to, userNames).toLowerCase().includes(q)
      )
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
                              title={formatValue(r.from, userNames)}
                            >
                              {formatValue(r.from, userNames)}
                            </span>
                          </td>

                          <td className="px-4 py-2 max-w-[400px] w-[320px]">
                            <span
                              className="block truncate font-mono text-xs text-green-700"
                              title={formatValue(r.to, userNames)}
                            >
                              {formatValue(r.to, userNames)}
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
