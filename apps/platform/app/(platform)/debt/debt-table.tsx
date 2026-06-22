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
import { type DebtRow } from '@/lib/types'
import { DEBT_OUTCOME_LABELS, DEBT_OUTCOME_COLOURS } from '@/lib/constants'

export function DebtTable({
  debts,
  userMap,
  provMap,
}: {
  debts: DebtRow[]
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
            <TableHead>Account</TableHead>
            <TableHead>Total owed</TableHead>
            <TableHead>Outcome</TableHead>
            <TableHead>Payment tried</TableHead>
            <TableHead>Assigned to</TableHead>
            <TableHead>Opened</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {debts.map((debt) => (
            <TableRow
              key={debt.id}
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => router.push(`/targets/debt/${debt.id}`)}
            >
              <TableCell className="font-medium">{debt.title}</TableCell>
              <TableCell className="font-mono text-sm">
                {debt.provisioningId ? (provMap[debt.provisioningId]?.accountNumber ?? '—') : '—'}
              </TableCell>
              <TableCell className="font-mono">£{Number(debt.totalOwed).toFixed(2)}</TableCell>
              <TableCell>
                {debt.outcome ? (
                  <Badge variant="outline" className={DEBT_OUTCOME_COLOURS[debt.outcome]}>
                    {DEBT_OUTCOME_LABELS[debt.outcome] ?? debt.outcome}
                  </Badge>
                ) : (
                  '—'
                )}
              </TableCell>
              <TableCell>
                <span className={debt.paymentTried ? 'text-green-600' : 'text-muted-foreground'}>
                  {debt.paymentTried ? 'Yes' : 'No'}
                </span>
              </TableCell>
              <TableCell>{debt.assignedTo ? (userMap[debt.assignedTo] ?? '—') : '—'}</TableCell>
              <TableCell className="text-muted-foreground text-sm">
                {new Date(debt.openedAt).toLocaleDateString('en-GB')}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {debts.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">No debt records found.</div>
      )}
    </div>
  )
}
