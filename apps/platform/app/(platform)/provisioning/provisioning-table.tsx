'use client'

import { useRouter } from 'next/navigation'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { type ProvisioningRow } from '@/lib/types'
import { SERVICE_STATUS_COLOURS } from '@/lib/constants'

function ServiceBadge({ status, label }: { status: string | null; label: string }) {
  if (!status) return <span className="text-muted-foreground text-xs">—</span>
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <Badge variant="outline" className={cn('text-xs', SERVICE_STATUS_COLOURS[status])}>
        {status.replace('_', ' ')}
      </Badge>
    </div>
  )
}

export function ProvisioningTable({ rows }: { rows: ProvisioningRow[] }) {
  const router = useRouter()

  return (
    <div className="border rounded-lg overflow-hidden overflow-x-auto">
      <Table className="min-w-max">
        <TableHeader>
          <TableRow>
            <TableHead>Account</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>BB</TableHead>
            <TableHead>WHC</TableHead>
            <TableHead>NFON</TableHead>
            <TableHead>MPF</TableHead>
            <TableHead>Router</TableHead>
            <TableHead>Proposed Live</TableHead>
            <TableHead>Date Ordered</TableHead>
            <TableHead>Last Checked</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow
              key={row.id}
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => router.push(`/provisioning/${row.accountNumber}`)}
            >
              <TableCell className="font-mono text-sm">{row.accountNumber ?? '—'}</TableCell>
              <TableCell className="font-medium">
                {row.companyName ?? `${row.firstName} ${row.lastName}`}
              </TableCell>
              <TableCell>
                <ServiceBadge status={row.bbStatus} label="BB" />
              </TableCell>
              <TableCell>
                <ServiceBadge status={row.whcStatus} label="WHC" />
              </TableCell>
              <TableCell>
                <ServiceBadge status={row.nfonStatus} label="NFON" />
              </TableCell>
              <TableCell>
                <ServiceBadge status={row.mpfStatus} label="MPF" />
              </TableCell>
              <TableCell>
                {row.routerDispatched === 'yes' ? (
                  <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">
                    Dispatched
                  </Badge>
                ) : row.routerDispatched === 'not_needed' ? (
                  <Badge variant="outline" className="bg-gray-100 text-gray-700 border-gray-200">
                    Not needed
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-red-100 text-red-700 border-red-200">
                    Not dispatched
                  </Badge>
                )}
              </TableCell>
              <TableCell>
                {row.proposedLiveDate
                  ? new Date(row.proposedLiveDate).toLocaleDateString('en-GB')
                  : '—'}
              </TableCell>
              <TableCell>
                {row.dateOrdered ? new Date(row.dateOrdered).toLocaleDateString('en-GB') : '—'}
              </TableCell>
              <TableCell className="text-muted-foreground text-xs">
                {row.lastCheckedAt
                  ? `${new Date(row.lastCheckedAt).toLocaleDateString('en-GB')}${row.lastCheckedBy ? ` · ${row.lastCheckedBy}` : ''}`
                  : '—'}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {rows.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">No provisioning orders yet.</div>
      )}
    </div>
  )
}
