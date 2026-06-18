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
  outstanding: 'bg-red-100 text-red-800 border-red-200',
  in_progress: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  resolved: 'bg-green-100 text-green-800 border-green-200',
}

const typeColours: Record<string, string> = {
  bb: 'bg-blue-100 text-blue-800 border-blue-200',
  line: 'bg-purple-100 text-purple-800 border-purple-200',
  upgrade: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  dfb: 'bg-orange-100 text-orange-800 border-orange-200',
  provisioning: 'bg-cyan-100 text-cyan-800 border-cyan-200',
  mobile: 'bg-pink-100 text-pink-800 border-pink-200',
  ticket: 'bg-gray-100 text-gray-700 border-gray-200',
}

type FaultRow = {
  id: string
  title: string
  type: string
  status: string
  ticketRef: string | null
  openedAt: Date | string
  resolvedAt: Date | string | null
  assignedTo: string | null
  provisioningId: string | null
  createdAt: Date | string
}

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
                <Badge variant="outline" className={typeColours[fault.type]}>
                  {fault.type.toUpperCase()}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge variant="outline" className={statusColours[fault.status]}>
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
