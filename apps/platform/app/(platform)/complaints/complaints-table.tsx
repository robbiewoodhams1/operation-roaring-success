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
import { type ComplaintRow } from '@/lib/types'
import {
  COMPLAINT_STATUS_COLOURS,
  COMPLAINT_TYPE_COLOURS,
  COMPLAINT_STATUS_LABELS,
  COMPLAINT_TYPE_LABELS,
} from '@/lib/constants'

export function ComplaintsTable({
  complaints,
  userMap,
  provMap,
}: {
  complaints: ComplaintRow[]
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
            <TableHead>Opened</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {complaints.map((complaint) => (
            <TableRow
              key={complaint.id}
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => router.push(`/complaints/${complaint.id}`)}
            >
              <TableCell className="font-medium">{complaint.title}</TableCell>
              <TableCell>
                <Badge variant="outline" className={COMPLAINT_TYPE_COLOURS[complaint.type]}>
                  {COMPLAINT_TYPE_LABELS[complaint.type] ?? complaint.type}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge variant="outline" className={COMPLAINT_STATUS_COLOURS[complaint.status]}>
                  {COMPLAINT_STATUS_LABELS[complaint.status] ?? complaint.status}
                </Badge>
              </TableCell>
              <TableCell className="font-mono text-sm">
                {complaint.provisioningId
                  ? (provMap[complaint.provisioningId]?.accountNumber ?? '—')
                  : '—'}
              </TableCell>
              <TableCell>
                {complaint.assignedTo ? (userMap[complaint.assignedTo] ?? '—') : '—'}
              </TableCell>
              <TableCell className="text-muted-foreground text-sm">
                {new Date(complaint.openedAt).toLocaleDateString('en-GB')}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {complaints.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">No complaints found.</div>
      )}
    </div>
  )
}
