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
import { type FaultRow } from '@/lib/types'
import { FAULT_STATUS_COLOURS, FAULT_TYPE_COLOURS } from '@/lib/constants'

export function FaultsTable({
  faults,
  userMap,
  provMap,
}: {
  faults: FaultRow[]
  userMap: Record<string, string>
  provMap: Record<string, { accountNumber: string; name: string }>
}) {
  const router = useRouter()

  return (
    <div className="border rounded-lg overflow-hidden overflow-x-auto">
      <Table className="min-w-max">
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Account</TableHead>
            <TableHead>Assigned to</TableHead>
            <TableHead>Ticket ref</TableHead>
            <TableHead>Opened</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {faults.map((fault) => (
            <TableRow
              key={fault.id}
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => router.push(`/faults/${fault.id}`)}
            >
              <TableCell className="font-medium">{fault.title}</TableCell>
              <TableCell>
                <Badge variant="outline" className={FAULT_TYPE_COLOURS[fault.type]}>
                  {fault.type.toUpperCase()}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge variant="outline" className={FAULT_STATUS_COLOURS[fault.status]}>
                  {fault.status.replace('_', ' ')}
                </Badge>
              </TableCell>
              <TableCell className="font-mono text-sm">
                {fault.provisioningId && provMap[fault.provisioningId]
                  ? provMap[fault.provisioningId].accountNumber
                  : '—'}
              </TableCell>
              <TableCell>{fault.assignedTo ? (userMap[fault.assignedTo] ?? '—') : '—'}</TableCell>
              <TableCell className="font-mono text-sm">{fault.ticketRef ?? '—'}</TableCell>
              <TableCell className="text-muted-foreground text-sm">
                {new Date(fault.openedAt).toLocaleDateString('en-GB')}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {faults.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">No faults found.</div>
      )}
    </div>
  )
}
