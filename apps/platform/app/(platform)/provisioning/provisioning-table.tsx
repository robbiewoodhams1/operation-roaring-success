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

const statusColours: Record<string, string> = {
  not_started: 'bg-gray-100 text-gray-700 border-gray-200',
  broadband_applied: 'bg-blue-100 text-blue-800 border-blue-200',
  whc_applied: 'bg-purple-100 text-purple-800 border-purple-200',
  broadband_and_whc_applied: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  live: 'bg-green-100 text-green-800 border-green-200',
  failed: 'bg-red-100 text-red-800 border-red-200',
}

const statusLabels: Record<string, string> = {
  not_started: 'Not started',
  broadband_applied: 'BB applied',
  whc_applied: 'WHC applied',
  broadband_and_whc_applied: 'BB & WHC applied',
  live: 'Live',
  failed: 'Failed',
}

const serviceStatusColours: Record<string, string> = {
  not_applied: 'bg-gray-100 text-gray-600 border-gray-200',
  cant_provision: 'bg-orange-100 text-orange-800 border-orange-200',
  applied: 'bg-blue-100 text-blue-800 border-blue-200',
  delayed: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  cancelled: 'bg-red-100 text-red-800 border-red-200',
  live: 'bg-green-100 text-green-800 border-green-200',
}

type ProvisioningRow = {
  id: string
  status: string
  dealId: string | null
  provisioner: string | null
  proposedLiveDate: string | null
  dateOrdered: string | null
  lastCheckedAt: Date | null
  lastCheckedBy: string | null
  wc1Outcome: string | null
  wc2Outcome: string | null
  routerDispatched: boolean
  accountNumber: string | null
  companyName: string | null
  firstName: string | null
  lastName: string | null
  salesAgent: string | null
  dealDate: string | null
  bbStatus: string | null
  whcStatus: string | null
  nfonStatus: string | null
  mpfStatus: string | null
}

function ServiceBadge({ status, label }: { status: string | null; label: string }) {
  if (!status) return <span className="text-muted-foreground text-xs">—</span>
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <Badge variant="outline" className={cn('text-xs', serviceStatusColours[status])}>
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
                {row.routerDispatched ? (
                  <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">
                    Dispatched
                  </Badge>
                ) : (
                  '—'
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
