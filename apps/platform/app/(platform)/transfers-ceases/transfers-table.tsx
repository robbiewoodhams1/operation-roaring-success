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
import {
  TRANSFER_CEASE_TYPE_LABELS,
  TRANSFER_CEASE_TYPE_COLOURS,
  TRANSFER_CEASE_STATUS_LABELS,
  TRANSFER_CEASE_STATUS_COLOURS,
} from '@/lib/constants'

type RecordRow = {
  id: string
  type: string
  status: string
  openedAt: Date | string
  completedAt: Date | string | null
  assignedTo: string | null
  provisioningId: string | null
  createdAt: Date | string
}

export function TransferCeasesTable({
  records,
  userMap,
  provMap,
}: {
  records: RecordRow[]
  userMap: Record<string, string>
  provMap: Record<string, { accountNumber: string; name: string }>
}) {
  const router = useRouter()

  return (
    <div className="border rounded-lg overflow-hidden overflow-x-auto">
      <Table className="min-w-max">
        <TableHeader>
          <TableRow>
            <TableHead>Type</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Account</TableHead>
            <TableHead>Assigned to</TableHead>
            <TableHead>Opened</TableHead>
            <TableHead>Completed</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {records.map((record) => (
            <TableRow
              key={record.id}
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => router.push(`/transfers-ceases/${record.id}`)}
            >
              <TableCell>
                <Badge variant="outline" className={TRANSFER_CEASE_TYPE_COLOURS[record.type]}>
                  {TRANSFER_CEASE_TYPE_LABELS[record.type] ?? record.type}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge variant="outline" className={TRANSFER_CEASE_STATUS_COLOURS[record.status]}>
                  {TRANSFER_CEASE_STATUS_LABELS[record.status] ?? record.status}
                </Badge>
              </TableCell>
              <TableCell className="font-mono text-sm">
                {record.provisioningId
                  ? (provMap[record.provisioningId]?.accountNumber ?? '—')
                  : '—'}
              </TableCell>
              <TableCell>{record.assignedTo ? (userMap[record.assignedTo] ?? '—') : '—'}</TableCell>
              <TableCell className="text-muted-foreground text-sm">
                {new Date(record.openedAt).toLocaleDateString('en-GB')}
              </TableCell>
              <TableCell className="text-muted-foreground text-sm">
                {record.completedAt
                  ? new Date(record.completedAt).toLocaleDateString('en-GB')
                  : '—'}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {records.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">No records found.</div>
      )}
    </div>
  )
}
