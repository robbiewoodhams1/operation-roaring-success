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

const statusColours: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  live: 'bg-green-100 text-green-800 border-green-200',
  cancelled: 'bg-red-100 text-red-800 border-red-200',
}

const contractLabels: Record<string, string> = {
  '24_months': '24m',
  '36_months': '36m',
  '48_months': '48m',
  other: 'Other',
}

type DealRow = {
  id: string
  dealDate: string
  status: string
  dealType: string
  salesAgent: string
  closingAgent: string
  accountNumber: string | null
  companyName: string | null
  firstName: string | null
  lastName: string | null
  bundlePrice: string | null
  wholesaleCost: string | null
  monthlyGp: string | null
  contractLength: string | null
}

export function DealsTable({ deals }: { deals: DealRow[] }) {
  const router = useRouter()

  return (
    <div className="border rounded-lg overflow-hidden overflow-x-auto">
      <Table className="min-w-max">
        <TableHeader>
          <TableRow>
            <TableHead>Account</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Sales Agent</TableHead>
            <TableHead>Closing Agent</TableHead>
            <TableHead>Bundle</TableHead>
            <TableHead>Wholesale</TableHead>
            <TableHead>GP</TableHead>
            <TableHead>Contract</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {deals.map((deal) => (
            <TableRow
              key={deal.id}
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => router.push(`/deals/${deal.accountNumber}`)}
            >
              <TableCell className="font-mono text-sm">{deal.accountNumber ?? '—'}</TableCell>
              <TableCell className="font-medium">
                {deal.companyName ?? `${deal.firstName} ${deal.lastName}`}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {new Date(deal.dealDate).toLocaleDateString('en-GB')}
              </TableCell>
              <TableCell>{deal.salesAgent}</TableCell>
              <TableCell>{deal.closingAgent}</TableCell>
              <TableCell className="font-mono">
                {deal.bundlePrice ? `£${Number(deal.bundlePrice).toFixed(2)}` : '—'}
              </TableCell>
              <TableCell className="font-mono">
                {deal.wholesaleCost ? `£${Number(deal.wholesaleCost).toFixed(2)}` : '—'}
              </TableCell>
              <TableCell className="font-mono">
                {deal.monthlyGp ? (
                  <span className={Number(deal.monthlyGp) >= 0 ? 'text-green-600' : 'text-red-600'}>
                    £{Number(deal.monthlyGp).toFixed(2)}
                  </span>
                ) : (
                  '—'
                )}
              </TableCell>
              <TableCell>
                {deal.contractLength
                  ? (contractLabels[deal.contractLength] ?? deal.contractLength)
                  : '—'}
              </TableCell>
              <TableCell>
                <Badge variant="outline" className={statusColours[deal.status]}>
                  {deal.status}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {deals.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">No deals yet.</div>
      )}
    </div>
  )
}
